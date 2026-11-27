-- Parent/guardian leads for event updates. Email is the dedupe key.
-- Interests are separate rows so one parent can follow several events.
-- Anon can submit only through submit_event_lead. Admins can read and update.

create table public.event_leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  parent_name text not null check (length(btrim(parent_name)) between 1 and 160),
  grade_band text check (grade_band is null or length(grade_band) <= 80),
  town text check (town is null or length(town) <= 120),
  source text not null check (length(btrim(source)) between 1 and 80),
  marketing_permission text not null default 'unknown'
    check (marketing_permission in ('unknown', 'opted_in', 'opted_out')),
  marketing_permission_at timestamptz,
  news_opt_in boolean not null default false,
  news_opt_in_at timestamptz,
  tags text[] not null default '{}',
  first_submitted_at timestamptz not null default now(),
  last_submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_leads_email_unique unique (email),
  constraint event_leads_email_shape check (email = lower(email) and length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);
create index event_leads_source_idx on public.event_leads (source, created_at desc);
create index event_leads_permission_idx on public.event_leads (marketing_permission, created_at desc);
create index event_leads_tags_idx on public.event_leads using gin (tags);
create trigger event_leads_updated before update on public.event_leads
  for each row execute function public.set_updated_at();
create trigger event_leads_audit after insert or update or delete on public.event_leads
  for each row execute function public.audit_row_change();

create table public.event_lead_interests (
  lead_id uuid not null references public.event_leads (id) on delete cascade,
  event_slug text not null check (event_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  source text not null,
  created_at timestamptz not null default now(),
  primary key (lead_id, event_slug)
);
create index event_lead_interests_slug_idx on public.event_lead_interests (event_slug, created_at desc);

create table public.event_lead_opt_ins (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.event_leads (id) on delete cascade,
  kind text not null check (kind in ('event_updates', 'general_news', 'marketing')),
  event_slug text,
  value text not null check (value in ('opted_in', 'opted_out', 'unknown')),
  source text not null,
  recorded_at timestamptz not null default now()
);
create index event_lead_opt_ins_lead_idx on public.event_lead_opt_ins (lead_id, recorded_at desc);

alter table public.event_leads enable row level security;
alter table public.event_lead_interests enable row level security;
alter table public.event_lead_opt_ins enable row level security;

revoke all on public.event_leads, public.event_lead_interests, public.event_lead_opt_ins from anon, authenticated;
grant select, insert, update, delete on public.event_leads, public.event_lead_interests, public.event_lead_opt_ins to authenticated;
grant all on public.event_leads, public.event_lead_interests, public.event_lead_opt_ins to service_role;

create policy event_leads_admin on public.event_leads for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy event_lead_interests_admin on public.event_lead_interests for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy event_lead_opt_ins_admin on public.event_lead_opt_ins for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 2027 calendar rows. Public pages hide venue, price, and eligibility until those fields are filled in.
insert into public.events (
  slug, title, event_type, summary, event_date, time_zone, registration_status, featured, status, seo_title, seo_description
) values
  ('shore-easter-classic', 'Shore Easter Classic', 'other', 'Spring football starts here.', '2027-03-27', 'America/New_York', 'coming_soon', true, 'published', 'Shore Easter Classic', 'Spring football starts here.'),
  ('her-flag-performance', 'Her Flag Performance Combine + All-Star Game', 'combine', 'Two days. Combine testing and All-Star football.', '2027-06-26', 'America/New_York', 'coming_soon', false, 'published', 'Her Flag Performance Combine + All-Star Game', 'Two days. Combine testing and All-Star football.'),
  ('usa-freedom-football-day', 'USA Freedom Football Day', 'other', 'A summer day of football, competition, and community.', '2027-07-17', 'America/New_York', 'coming_soon', false, 'published', 'USA Freedom Football Day', 'A summer day of football, competition, and community.'),
  ('turkey-bowl-2027', 'Turkey Bowl Combine Classic', 'combine', 'The Turkey Bowl returns Thanksgiving weekend.', '2027-11-27', 'America/New_York', 'coming_soon', false, 'published', 'Turkey Bowl Combine Classic', 'The Turkey Bowl returns Thanksgiving weekend.')
on conflict (slug) do update set
  title = excluded.title,
  event_type = excluded.event_type,
  summary = excluded.summary,
  event_date = excluded.event_date,
  registration_status = 'coming_soon',
  status = 'published',
  seo_title = excluded.seo_title,
  seo_description = excluded.seo_description;

create function public.submit_event_lead(
  p_name text,
  p_email text,
  p_grade_band text,
  p_town text,
  p_event_slugs text[],
  p_news_opt_in boolean
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_name text := btrim(coalesce(p_name, ''));
  v_grade text := nullif(btrim(coalesce(p_grade_band, '')), '');
  v_town text := nullif(btrim(coalesce(p_town, '')), '');
  v_slug text;
  v_id uuid;
  v_news boolean;
  v_inserted uuid;
begin
  if v_name = '' or length(v_name) > 160 then
    raise exception 'Enter the parent or guardian name.' using errcode = '23514';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_email) > 254 then
    raise exception 'Enter a valid email address.' using errcode = '23514';
  end if;
  if v_town is not null and length(v_town) > 120 then
    raise exception 'Town is too long.' using errcode = '23514';
  end if;
  if v_grade is not null and v_grade not in ('3rd-6th grade', '7th-9th grade', 'Other') then
    raise exception 'Choose a grade band or leave it blank.' using errcode = '23514';
  end if;
  if p_event_slugs is null or cardinality(p_event_slugs) < 1 or cardinality(p_event_slugs) > 8 then
    raise exception 'Choose at least one event.' using errcode = '23514';
  end if;
  if exists (
    select 1 from unnest(p_event_slugs) as slug
    where slug not in ('shore-easter-classic', 'her-flag-performance', 'usa-freedom-football-day', 'turkey-bowl-2027')
  ) then
    raise exception 'Choose an event from the 2027 calendar.' using errcode = '23514';
  end if;

  insert into public.event_leads (email, parent_name, grade_band, town, source, last_submitted_at)
  values (v_email, v_name, v_grade, v_town, 'website', now())
  on conflict (email) do update set
    parent_name = excluded.parent_name,
    grade_band = coalesce(excluded.grade_band, public.event_leads.grade_band),
    town = coalesce(excluded.town, public.event_leads.town),
    last_submitted_at = now()
  returning id into v_id;

  select news_opt_in into v_news from public.event_leads where id = v_id;
  if coalesce(p_news_opt_in, false) and not v_news then
    update public.event_leads set news_opt_in = true, news_opt_in_at = now() where id = v_id;
    insert into public.event_lead_opt_ins (lead_id, kind, value, source)
    values (v_id, 'general_news', 'opted_in', 'website');
  end if;

  for v_slug in select distinct slug from unnest(p_event_slugs) as slug loop
    insert into public.event_lead_interests (lead_id, event_slug, source)
    values (v_id, v_slug, 'website')
    on conflict (lead_id, event_slug) do nothing
    returning lead_id into v_inserted;
    if v_inserted is not null then
      insert into public.event_lead_opt_ins (lead_id, kind, event_slug, value, source)
      values (v_id, 'event_updates', v_slug, 'opted_in', 'website');
    end if;
    v_inserted := null;
  end loop;
end;
$$;

revoke all on function public.submit_event_lead(text, text, text, text, text[], boolean) from public, anon, authenticated;
grant execute on function public.submit_event_lead(text, text, text, text, text[], boolean) to anon, authenticated, service_role;
