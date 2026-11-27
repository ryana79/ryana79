-- Row Level Security. Default deny: every table has RLS enabled; policies grant minimal access.
-- Server code ALSO checks roles before every sensitive write (defence in depth).

alter table public.user_roles enable row level security;
alter table public.audit_logs enable row level security;
alter table public.profiles enable row level security;
alter table public.guardians enable row level security;
alter table public.athletes enable row level security;
alter table public.athlete_private enable row level security;
alter table public.guardian_athletes enable row level security;
alter table public.athlete_consents enable row level security;
alter table public.site_settings enable row level security;
alter table public.sponsors enable row level security;
alter table public.events enable row level security;
alter table public.event_staff enable row level security;
alter table public.event_sponsors enable row level security;
alter table public.event_registrations enable row level security;
alter table public.jotform_submissions enable row level security;
alter table public.event_participation enable row level security;
alter table public.combine_test_types enable row level security;
alter table public.import_batches enable row level security;
alter table public.import_rows enable row level security;
alter table public.field_mapping_presets enable row level security;
alter table public.external_record_mappings enable row level security;
alter table public.combine_results enable row level security;
alter table public.rankings enable row level security;
alter table public.ranking_entries enable row level security;
alter table public.articles enable row level security;
alter table public.memberships enable row level security;
alter table public.media_assets enable row level security;
alter table public.inquiries enable row level security;
alter table public.data_requests enable row level security;

-- Privileges: nothing for anon unless granted below; authenticated is governed by RLS.
revoke all on all tables in schema public from anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;

-- Public predicate for athletes: approved + public + consent granted.
create function public.athlete_is_public(p_athlete uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.athletes a
    where a.id = p_athlete and a.public_visibility and a.profile_status = 'approved' and a.consent_status = 'granted'
  );
$$;
grant execute on function public.athlete_is_public(uuid) to anon, authenticated, service_role;

-- user_roles
create policy user_roles_select on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy user_roles_owner_write on public.user_roles for all to authenticated
  using (public.has_role('owner')) with check (public.has_role('owner'));

-- audit_logs: admins read; writes happen only through SECURITY DEFINER functions/triggers
create policy audit_logs_select on public.audit_logs for select to authenticated using (public.is_admin());

-- profiles
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_staff());
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- guardians (future dashboards)
create policy guardians_select on public.guardians for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy guardians_admin on public.guardians for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy guardian_athletes_select on public.guardian_athletes for select to authenticated
  using (public.is_admin() or exists (select 1 from public.guardians g where g.id = guardian_id and g.user_id = auth.uid()));
create policy guardian_athletes_admin on public.guardian_athletes for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- athletes
grant select on public.athletes to anon;
create policy athletes_public_read on public.athletes for select to anon, authenticated
  using (public_visibility and profile_status = 'approved' and consent_status = 'granted');
create policy athletes_staff_read on public.athletes for select to authenticated using (public.is_staff());
create policy athletes_admin_write on public.athletes for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy athlete_private_admin on public.athlete_private for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy athlete_consents_admin_read on public.athlete_consents for select to authenticated using (public.is_admin());
create policy athlete_consents_admin_insert on public.athlete_consents for insert to authenticated
  with check (public.is_admin() and recorded_by = auth.uid());

-- site_settings
grant select on public.site_settings to anon;
create policy site_settings_public_read on public.site_settings for select to anon, authenticated using (is_public);
create policy site_settings_staff_read on public.site_settings for select to authenticated using (public.is_staff());
create policy site_settings_write on public.site_settings for all to authenticated
  using (
    public.has_role('owner')
    or (public.is_admin() and key <> 'coppa')
    or (public.is_editor() and is_public and key <> 'coppa')
  )
  with check (
    public.has_role('owner')
    or (public.is_admin() and key <> 'coppa')
    or (public.is_editor() and is_public and key <> 'coppa')
  );

-- sponsors / events / staff
grant select on public.sponsors, public.events, public.event_staff, public.event_sponsors to anon;
create policy sponsors_public_read on public.sponsors for select to anon, authenticated using (active);
create policy sponsors_staff_read on public.sponsors for select to authenticated using (public.is_staff());
create policy sponsors_editor_write on public.sponsors for all to authenticated
  using (public.is_editor()) with check (public.is_editor());

-- archived events stay readable so historical verified results keep their event context; pages hide them
create policy events_public_read on public.events for select to anon, authenticated using (status in ('published', 'archived'));
create policy events_staff_read on public.events for select to authenticated using (public.is_staff());
create policy events_editor_insert on public.events for insert to authenticated with check (public.is_editor());
create policy events_editor_update on public.events for update to authenticated
  using (public.is_editor()) with check (public.is_editor());
create policy events_admin_delete on public.events for delete to authenticated using (public.is_admin());

create policy event_staff_public_read on public.event_staff for select to anon, authenticated
  using (exists (select 1 from public.events e where e.id = event_id and e.status = 'published'));
create policy event_staff_staff_read on public.event_staff for select to authenticated using (public.is_staff());
create policy event_staff_editor_write on public.event_staff for all to authenticated
  using (public.is_editor()) with check (public.is_editor());

create policy event_sponsors_public_read on public.event_sponsors for select to anon, authenticated
  using (exists (select 1 from public.events e where e.id = event_id and e.status = 'published'));
create policy event_sponsors_staff_read on public.event_sponsors for select to authenticated using (public.is_staff());
create policy event_sponsors_editor_write on public.event_sponsors for all to authenticated
  using (public.is_editor()) with check (public.is_editor());

-- registrations: private, admin only (webhook writes with the service role)
create policy event_registrations_admin on public.event_registrations for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy jotform_submissions_admin_read on public.jotform_submissions for select to authenticated using (public.is_admin());

-- participation
grant select on public.event_participation to anon;
create policy event_participation_public_read on public.event_participation for select to anon, authenticated
  using (public.athlete_is_public(athlete_id) and exists (select 1 from public.events e where e.id = event_id and e.status in ('published', 'archived')));
create policy event_participation_staff_read on public.event_participation for select to authenticated using (public.is_staff());
create policy event_participation_admin_write on public.event_participation for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- combine
grant select on public.combine_test_types, public.combine_results to anon;
create policy combine_test_types_public_read on public.combine_test_types for select to anon, authenticated using (active);
create policy combine_test_types_staff_read on public.combine_test_types for select to authenticated using (public.is_staff());
create policy combine_test_types_admin_write on public.combine_test_types for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy combine_results_public_read on public.combine_results for select to anon, authenticated
  using (verification_status = 'verified' and is_current and public.athlete_is_public(athlete_id));
create policy combine_results_staff_read on public.combine_results for select to authenticated using (public.is_staff());
create policy combine_results_staff_insert on public.combine_results for insert to authenticated
  with check (public.is_staff());
create policy combine_results_staff_update on public.combine_results for update to authenticated
  using (public.is_admin() or (public.is_staff() and verification_status <> 'verified'))
  with check (public.is_staff());

-- imports (admin only; raw rows may hold private data)
create policy import_batches_admin on public.import_batches for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy import_rows_admin on public.import_rows for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy field_mapping_presets_admin on public.field_mapping_presets for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy external_record_mappings_admin on public.external_record_mappings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- rankings
grant select on public.rankings, public.ranking_entries to anon;
create policy rankings_public_read on public.rankings for select to anon, authenticated using (status = 'published');
create policy rankings_staff_read on public.rankings for select to authenticated using (public.is_staff());
create policy rankings_admin_write on public.rankings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy ranking_entries_public_read on public.ranking_entries for select to anon, authenticated
  using (public.athlete_is_public(athlete_id) and exists (select 1 from public.rankings r where r.id = ranking_id and r.status = 'published'));
create policy ranking_entries_staff_read on public.ranking_entries for select to authenticated using (public.is_staff());
create policy ranking_entries_admin_write on public.ranking_entries for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- articles
grant select on public.articles to anon;
create policy articles_public_read on public.articles for select to anon, authenticated
  using (status = 'published' and published_at <= now());
create policy articles_staff_read on public.articles for select to authenticated using (public.is_staff());
create policy articles_editor_write on public.articles for all to authenticated
  using (public.is_editor()) with check (public.is_editor());

-- memberships (users read their own; writes come from the future billing webhook via service role)
create policy memberships_select on public.memberships for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy memberships_admin_write on public.memberships for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy media_assets_staff_read on public.media_assets for select to authenticated using (public.is_staff());
create policy media_assets_editor_write on public.media_assets for all to authenticated
  using (public.is_editor()) with check (public.is_editor());

-- inbound forms: anyone may submit; only admins may read
grant insert on public.inquiries, public.data_requests to anon;
create policy inquiries_insert on public.inquiries for insert to anon, authenticated
  with check (status = 'new');
create policy inquiries_admin on public.inquiries for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy data_requests_insert on public.data_requests for insert to anon, authenticated
  with check (status = 'received' and handled_by is null and athlete_id is null);
create policy data_requests_admin on public.data_requests for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Internal helper functions must not be callable by the public API.
revoke execute on function public.latest_consent(uuid), public.athlete_may_be_under_13(uuid) from public, anon, authenticated;
revoke execute on function public.correct_combine_result(uuid, numeric, text) from public, anon;
grant execute on function public.correct_combine_result(uuid, numeric, text) to authenticated;
