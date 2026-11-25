-- Transactional spreadsheet import application. Validation/matching happen in the app (preview);
-- this function applies admin-approved decisions atomically per batch with a savepoint per row.
-- Imported athletes are ALWAYS created as private drafts with no consent: import never publishes.

create function public.imp_text(p_cur text, p_inc text, p_protect boolean) returns text
language sql immutable as $$
  select case when p_protect and nullif(btrim(coalesce(p_cur, '')), '') is not null then p_cur
              else coalesce(nullif(btrim(coalesce(p_inc, '')), ''), p_cur) end;
$$;
create function public.imp_num(p_cur numeric, p_inc numeric, p_protect boolean) returns numeric
language sql immutable as $$
  select case when p_protect and p_cur is not null then p_cur else coalesce(p_inc, p_cur) end;
$$;
create function public.imp_arr(p_cur text[], p_inc text[], p_protect boolean) returns text[]
language sql immutable as $$
  select case when p_protect and coalesce(array_length(p_cur, 1), 0) > 0 then p_cur
              when coalesce(array_length(p_inc, 1), 0) > 0 then p_inc
              else p_cur end;
$$;

create function public.apply_import_batch(p_batch uuid, p_mode text, p_allow_overwrite boolean default false)
returns jsonb
language plpgsql set search_path = public, pg_temp
as $$
declare
  v_batch public.import_batches;
  r public.import_rows;
  n jsonb;
  v_created int := 0;
  v_updated int := 0;
  v_skipped int := 0;
  v_failed int := 0;
  v_target uuid;
  v_new uuid;
  v_cur public.athletes;
  v_protect boolean;
  v_priv public.athlete_private;
  v_res jsonb;
  v_type public.combine_test_types;
  v_count int;
  v_msg text;
  v_status text;
  v_entity uuid;
begin
  if not public.is_admin() then
    raise exception 'Only an admin or owner can apply imports' using errcode = '42501';
  end if;
  if p_mode not in ('add_new', 'update_matched', 'add_and_update', 'preview_only') then
    raise exception 'Invalid import mode %', p_mode;
  end if;
  select * into v_batch from public.import_batches where id = p_batch for update;
  if v_batch.id is null then
    raise exception 'Import batch not found';
  end if;
  if v_batch.status = 'applied' then
    raise exception 'This batch has already been applied';
  end if;
  if p_mode = 'preview_only' then
    update public.import_batches set mode = p_mode, status = 'previewed' where id = p_batch;
    return jsonb_build_object('mode', p_mode, 'created', 0, 'updated', 0, 'skipped', 0, 'failed', 0);
  end if;
  if v_batch.kind = 'combine_results' and v_batch.event_id is null then
    raise exception 'Combine result imports require an event';
  end if;

  for r in select * from public.import_rows where batch_id = p_batch order by row_number loop
    v_status := 'skipped';
    v_msg := null;
    v_entity := null;
    begin
      n := r.normalized;
      v_target := coalesce(r.decision_athlete_id, r.matched_athlete_id);

      if r.match_status = 'invalid' or r.decision is null or r.decision = 'skip' then
        v_msg := case when r.match_status = 'invalid' then 'Skipped: row has validation errors'
                      when r.decision is null then 'Skipped: unresolved match needs admin review'
                      else 'Skipped by admin' end;

      elsif v_batch.kind = 'athletes' and r.decision = 'create' then
        if p_mode = 'update_matched' then
          v_msg := 'Skipped: mode is update-matched only';
        else
          insert into public.athletes (
            first_name, last_name, display_name, graduation_year, current_grade, primary_position,
            secondary_position, team, school_public, town, state, region, height_in, weight_lb,
            highlight_urls, awards, achievements, bio)
          values (
            n ->> 'first_name', n ->> 'last_name', nullif(n ->> 'display_name', ''),
            (n ->> 'graduation_year')::int, (n ->> 'current_grade')::int,
            nullif(n ->> 'primary_position', ''), nullif(n ->> 'secondary_position', ''),
            nullif(n ->> 'team', ''), nullif(n ->> 'school_public', ''), nullif(n ->> 'town', ''),
            nullif(n ->> 'state', ''), nullif(n ->> 'region', ''),
            (n ->> 'height_in')::numeric, (n ->> 'weight_lb')::numeric,
            coalesce(array(select jsonb_array_elements_text(n -> 'highlight_urls')), '{}'),
            coalesce(array(select jsonb_array_elements_text(n -> 'awards')), '{}'),
            coalesce(array(select jsonb_array_elements_text(n -> 'achievements')), '{}'),
            nullif(n ->> 'bio', ''))
          returning id into v_new;
          if n ? 'birth_date' or n ? 'school' or n ? 'parent_name' or n ? 'parent_email' or n ? 'parent_phone' then
            insert into public.athlete_private (athlete_id, birth_date, school, parent_name, parent_email, parent_phone)
            values (v_new, nullif(n ->> 'birth_date', '')::date, nullif(n ->> 'school', ''),
                    nullif(n ->> 'parent_name', ''), nullif(n ->> 'parent_email', ''), nullif(n ->> 'parent_phone', ''))
            on conflict (athlete_id) do nothing;
          end if;
          v_target := v_new;
          v_status := 'created';
          v_entity := v_new;
        end if;

      elsif v_batch.kind = 'athletes' and r.decision = 'link' then
        if p_mode = 'add_new' then
          v_msg := 'Skipped: matched an existing athlete and mode is add-new only';
        elsif v_target is null then
          raise exception 'No target athlete for link decision';
        else
          select * into v_cur from public.athletes where id = v_target for update;
          if v_cur.id is null then
            raise exception 'Matched athlete no longer exists';
          end if;
          v_protect := v_cur.profile_status = 'approved' and not p_allow_overwrite;
          update public.athletes set
            first_name = public.imp_text(v_cur.first_name, n ->> 'first_name', v_protect),
            last_name = public.imp_text(v_cur.last_name, n ->> 'last_name', v_protect),
            display_name = public.imp_text(v_cur.display_name, n ->> 'display_name', v_protect),
            graduation_year = public.imp_num(v_cur.graduation_year, (n ->> 'graduation_year')::numeric, v_protect)::int,
            current_grade = public.imp_num(v_cur.current_grade, (n ->> 'current_grade')::numeric, v_protect)::int,
            primary_position = public.imp_text(v_cur.primary_position, n ->> 'primary_position', v_protect),
            secondary_position = public.imp_text(v_cur.secondary_position, n ->> 'secondary_position', v_protect),
            team = public.imp_text(v_cur.team, n ->> 'team', v_protect),
            school_public = public.imp_text(v_cur.school_public, n ->> 'school_public', v_protect),
            town = public.imp_text(v_cur.town, n ->> 'town', v_protect),
            state = public.imp_text(v_cur.state, n ->> 'state', v_protect),
            region = public.imp_text(v_cur.region, n ->> 'region', v_protect),
            height_in = public.imp_num(v_cur.height_in, (n ->> 'height_in')::numeric, v_protect),
            weight_lb = public.imp_num(v_cur.weight_lb, (n ->> 'weight_lb')::numeric, v_protect),
            highlight_urls = public.imp_arr(v_cur.highlight_urls, array(select jsonb_array_elements_text(n -> 'highlight_urls')), v_protect),
            awards = public.imp_arr(v_cur.awards, array(select jsonb_array_elements_text(n -> 'awards')), v_protect),
            achievements = public.imp_arr(v_cur.achievements, array(select jsonb_array_elements_text(n -> 'achievements')), v_protect),
            bio = public.imp_text(v_cur.bio, n ->> 'bio', v_protect)
          where id = v_target;

          select * into v_priv from public.athlete_private where athlete_id = v_target;
          if v_priv.athlete_id is null then
            insert into public.athlete_private (athlete_id, birth_date, school, parent_name, parent_email, parent_phone)
            values (v_target, nullif(n ->> 'birth_date', '')::date, nullif(n ->> 'school', ''),
                    nullif(n ->> 'parent_name', ''), nullif(n ->> 'parent_email', ''), nullif(n ->> 'parent_phone', ''));
          else
            update public.athlete_private set
              birth_date = coalesce(nullif(n ->> 'birth_date', '')::date, birth_date),
              school = coalesce(nullif(n ->> 'school', ''), school),
              parent_name = coalesce(nullif(n ->> 'parent_name', ''), parent_name),
              parent_email = coalesce(nullif(n ->> 'parent_email', ''), parent_email),
              parent_phone = coalesce(nullif(n ->> 'parent_phone', ''), parent_phone)
            where athlete_id = v_target;
          end if;
          v_status := 'updated';
          v_entity := v_target;
        end if;

      elsif v_batch.kind = 'combine_results' then
        if r.decision <> 'link' or v_target is null then
          v_msg := 'Skipped: no matching athlete (import athletes first)';
        else
          v_count := 0;
          for v_res in select * from jsonb_array_elements(coalesce(n -> 'results', '[]'::jsonb)) loop
            select * into v_type from public.combine_test_types where slug = v_res ->> 'test_slug';
            if v_type.id is null then
              raise exception 'Unknown test type %', v_res ->> 'test_slug';
            end if;
            insert into public.combine_results
              (athlete_id, event_id, test_type_id, value, unit, attempt_number, protocol, tested_on,
               source, import_batch_id, created_by)
            values
              (v_target, v_batch.event_id, v_type.id, (v_res ->> 'value')::numeric, v_type.unit,
               coalesce((v_res ->> 'attempt')::int, 1), coalesce(nullif(v_res ->> 'protocol', ''), 'standard'),
               nullif(v_res ->> 'tested_on', '')::date, 'import', p_batch, auth.uid());
            v_count := v_count + 1;
          end loop;
          if v_count = 0 then
            v_msg := 'Skipped: no result values in row';
          else
            v_status := 'created';
            v_entity := v_target;
            v_msg := v_count || ' result(s) added as unverified';
          end if;
        end if;
      end if;

      if v_batch.kind = 'athletes' and v_target is not null and v_status in ('created', 'updated') then
        if nullif(n ->> 'external_id', '') is not null then
          if exists (
            select 1 from public.external_record_mappings
            where entity_type = 'athlete' and source_system = v_batch.source_system
              and external_id = n ->> 'external_id' and entity_id <> v_target
          ) then
            raise exception 'External id % is already linked to a different athlete', n ->> 'external_id';
          end if;
          insert into public.external_record_mappings (entity_id, source_system, external_id, import_batch_id)
          values (v_target, v_batch.source_system, n ->> 'external_id', p_batch)
          on conflict (entity_type, source_system, external_id) do nothing;
        end if;
        if v_batch.event_id is not null then
          insert into public.event_participation (event_id, athlete_id, source)
          values (v_batch.event_id, v_target, 'import')
          on conflict do nothing;
        end if;
      end if;

      update public.import_rows set result_status = v_status, result_message = v_msg, result_entity_id = v_entity
      where id = r.id;
      if v_status = 'created' then v_created := v_created + 1;
      elsif v_status = 'updated' then v_updated := v_updated + 1;
      else v_skipped := v_skipped + 1; end if;
    exception when others then
      v_failed := v_failed + 1;
      update public.import_rows set result_status = 'failed', result_message = left(sqlerrm, 500) where id = r.id;
    end;
  end loop;

  update public.import_batches set
    status = 'applied', mode = p_mode, allow_overwrite = p_allow_overwrite, applied_by = auth.uid(), applied_at = now(),
    summary = jsonb_build_object('created', v_created, 'updated', v_updated, 'skipped', v_skipped, 'failed', v_failed)
  where id = p_batch;
  perform public.write_audit('import_applied', 'import_batches', p_batch::text, null, null,
    jsonb_build_object('mode', p_mode, 'created', v_created, 'updated', v_updated, 'skipped', v_skipped, 'failed', v_failed));
  return jsonb_build_object('mode', p_mode, 'created', v_created, 'updated', v_updated, 'skipped', v_skipped, 'failed', v_failed);
end;
$$;

-- Privacy hygiene: drop raw spreadsheet cells and private fields once an import is finished.
create function public.purge_import_raw(p_batch uuid) returns void
language plpgsql set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  update public.import_rows
  set raw = '{}'::jsonb,
      normalized = normalized - 'birth_date' - 'parent_name' - 'parent_email' - 'parent_phone' - 'school'
  where batch_id = p_batch;
  update public.import_batches set raw_purged_at = now() where id = p_batch;
  perform public.write_audit('import_raw_purged', 'import_batches', p_batch::text);
end;
$$;

revoke execute on function public.apply_import_batch(uuid, text, boolean), public.purge_import_raw(uuid) from public, anon;
grant execute on function public.apply_import_batch(uuid, text, boolean), public.purge_import_raw(uuid) to authenticated;
