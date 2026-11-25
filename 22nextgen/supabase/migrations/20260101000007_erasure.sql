-- Permanent athlete erasure for deletion requests. Admin/owner only. Removes the athlete, private data,
-- consent trail, participation, linked registrations, combine results and ranking entries. The audit log keeps a content-free record.
create function public.erase_athlete(p_athlete uuid)
returns text
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_image text;
begin
  if not public.is_admin() then
    raise exception 'Only an admin or owner can erase an athlete' using errcode = '42501';
  end if;
  select profile_image_path into v_image from public.athletes where id = p_athlete;
  if not found then
    raise exception 'Athlete not found' using errcode = 'P0002';
  end if;
  update public.combine_results set supersedes_id = null where athlete_id = p_athlete;
  delete from public.combine_results where athlete_id = p_athlete;
  delete from public.ranking_entries where athlete_id = p_athlete;
  delete from public.event_registrations where athlete_id = p_athlete;
  delete from public.athletes where id = p_athlete;
  perform public.write_audit('athlete_erased', 'athletes', p_athlete::text, null, null, '{}'::jsonb);
  return v_image;
end;
$$;
revoke execute on function public.erase_athlete(uuid) from public, anon;
grant execute on function public.erase_athlete(uuid) to authenticated;
