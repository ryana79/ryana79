-- Events, registrations (private), participation, sponsors, news, rankings, memberships.

create table public.sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 160),
  slug text not null unique,
  website_url text check (website_url is null or website_url ~* '^https?://'),
  description text check (description is null or length(description) <= 2000),
  tier text not null default 'partner'
    check (tier in ('presenting', 'title', 'gold', 'silver', 'bronze', 'community', 'partner')),
  category text,
  logo_path text,
  featured boolean not null default false,
  active boolean not null default true,
  sort_order int not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index sponsors_active_idx on public.sponsors (active, sort_order);
create trigger sponsors_updated before update on public.sponsors
  for each row execute function public.set_updated_at();
create trigger sponsors_audit after insert or update or delete on public.sponsors
  for each row execute function public.audit_row_change();

create table public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (length(btrim(title)) between 1 and 200),
  event_type text not null default 'combine'
    check (event_type in ('combine', 'showcase', 'camp', 'clinic', 'skills_session', 'other')),
  summary text check (summary is null or length(summary) <= 500),
  description text,
  event_date date,
  start_time time,
  end_time time,
  time_zone text not null default 'America/New_York',
  venue_name text,
  address_line text,
  city text,
  state text check (state is null or state ~ '^[A-Z]{2}$'),
  postal_code text,
  region text,
  eligible_age_min int check (eligible_age_min is null or eligible_age_min between 4 and 25),
  eligible_age_max int check (eligible_age_max is null or eligible_age_max between 4 and 25),
  eligible_grades int[] not null default '{}',
  eligible_grad_years int[] not null default '{}',
  eligibility_notes text,
  price_cents int check (price_cents is null or price_cents >= 0),
  price_note text,
  capacity int check (capacity is null or capacity > 0),
  registration_status text not null default 'coming_soon'
    check (registration_status in ('coming_soon', 'open', 'waitlist', 'sold_out', 'closed')),
  itinerary jsonb not null default '[]'::jsonb,
  faqs jsonb not null default '[]'::jsonb,
  hero_image_path text,
  card_image_path text,
  gallery jsonb not null default '[]'::jsonb,
  jotform_form_id text check (jotform_form_id is null or jotform_form_id ~ '^[0-9]{8,24}$'),
  jotform_url text check (jotform_url is null or jotform_url ~* '^https://([a-z0-9-]+\.)*jotform\.(com|pro|us)/'),
  featured boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  archived_at timestamptz,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_published_needs_date check (status <> 'published' or event_date is not null),
  constraint events_age_range check (eligible_age_min is null or eligible_age_max is null or eligible_age_min <= eligible_age_max)
);
create index events_public_idx on public.events (event_date) where status = 'published';
create unique index events_form_idx on public.events (jotform_form_id) where jotform_form_id is not null;
create trigger events_updated before update on public.events
  for each row execute function public.set_updated_at();
create trigger events_audit after insert or update or delete on public.events
  for each row execute function public.audit_row_change();

create function public.events_publish_stamp() returns trigger
language plpgsql as $$
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    new.published_at := coalesce(new.published_at, now());
  end if;
  if new.status = 'archived' and (tg_op = 'INSERT' or old.status is distinct from 'archived') then
    new.archived_at := now();
  end if;
  return new;
end;
$$;
create trigger events_publish_stamp before insert or update on public.events
  for each row execute function public.events_publish_stamp();

create table public.event_staff (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null,
  role_title text,
  bio text,
  image_path text,
  sort_order int not null default 100
);
create index event_staff_event_idx on public.event_staff (event_id, sort_order);

create table public.event_sponsors (
  event_id uuid not null references public.events (id) on delete cascade,
  sponsor_id uuid not null references public.sponsors (id) on delete cascade,
  primary key (event_id, sponsor_id)
);

-- Private registrations (from Jotform webhooks). Events with registrations cannot be hard-deleted.
create table public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete restrict,
  jotform_submission_id text not null unique,
  jotform_form_id text not null,
  athlete_id uuid references public.athletes (id) on delete set null,
  participant_first_name text,
  participant_last_name text,
  graduation_year int,
  grade int,
  position text,
  team text,
  parent_name text,
  parent_email text,
  parent_phone text,
  answers jsonb not null default '{}'::jsonb,
  payment_status text not null default 'unverified'
    check (payment_status in ('unverified', 'verified', 'unpaid', 'refunded', 'not_applicable')),
  status text not null default 'received' check (status in ('received', 'confirmed', 'cancelled')),
  review_status text not null default 'needs_review'
    check (review_status in ('needs_review', 'linked', 'new_athlete', 'ignored')),
  candidate_athlete_ids uuid[] not null default '{}',
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index event_registrations_event_idx on public.event_registrations (event_id);
create index event_registrations_review_idx on public.event_registrations (review_status);
create trigger event_registrations_updated before update on public.event_registrations
  for each row execute function public.set_updated_at();
create trigger event_registrations_audit after insert or update or delete on public.event_registrations
  for each row execute function public.audit_row_change();

-- Operational log of webhook deliveries (ids and outcomes only; no participant data).
create table public.jotform_submissions (
  id uuid primary key default gen_random_uuid(),
  submission_id text not null,
  form_id text,
  event_id uuid references public.events (id) on delete set null,
  outcome text not null check (outcome in ('processed', 'duplicate', 'rejected', 'error')),
  error text,
  received_at timestamptz not null default now()
);
create index jotform_submissions_sub_idx on public.jotform_submissions (submission_id);

create table public.event_participation (
  event_id uuid not null references public.events (id) on delete restrict,
  athlete_id uuid not null references public.athletes (id) on delete cascade,
  status text not null default 'registered' check (status in ('registered', 'attended', 'no_show')),
  source text not null default 'manual' check (source in ('manual', 'jotform', 'import')),
  created_at timestamptz not null default now(),
  primary key (event_id, athlete_id)
);
create index event_participation_athlete_idx on public.event_participation (athlete_id);

-- Combine testing -----------------------------------------------------------
create table public.combine_test_types (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9_]+$'),
  name text not null,
  unit text not null,
  direction text not null check (direction in ('lower_is_better', 'higher_is_better')),
  min_value numeric(8, 3) not null,
  max_value numeric(8, 3) not null,
  decimals int not null default 2 check (decimals between 0 and 3),
  protocol_note text,
  is_builtin boolean not null default false,
  active boolean not null default true,
  sort_order int not null default 100,
  created_at timestamptz not null default now(),
  constraint combine_test_range check (min_value < max_value)
);
create trigger combine_test_types_audit after insert or update or delete on public.combine_test_types
  for each row execute function public.audit_row_change();

create table public.import_batches (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('athletes', 'combine_results')),
  filename text,
  sheet_name text,
  status text not null default 'staged' check (status in ('staged', 'previewed', 'applied', 'failed', 'cancelled')),
  mode text check (mode in ('add_new', 'update_matched', 'add_and_update', 'preview_only')),
  mapping jsonb not null default '{}'::jsonb,
  event_id uuid references public.events (id) on delete set null,
  source_system text not null default 'spreadsheet',
  allow_overwrite boolean not null default false,
  row_count int not null default 0,
  summary jsonb not null default '{}'::jsonb,
  raw_purged_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  applied_by uuid references auth.users (id) on delete set null,
  applied_at timestamptz,
  created_at timestamptz not null default now()
);
create index import_batches_created_idx on public.import_batches (created_at desc);
create trigger import_batches_audit after insert or update on public.import_batches
  for each row execute function public.audit_row_change();

create table public.import_rows (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.import_batches (id) on delete cascade,
  row_number int not null,
  raw jsonb not null default '{}'::jsonb,
  normalized jsonb not null default '{}'::jsonb,
  errors jsonb not null default '[]'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  match_status text not null default 'new'
    check (match_status in ('new', 'matched', 'ambiguous', 'duplicate_in_file', 'invalid')),
  matched_athlete_id uuid references public.athletes (id) on delete set null,
  candidates jsonb not null default '[]'::jsonb,
  decision text check (decision in ('create', 'link', 'skip')),
  decision_athlete_id uuid references public.athletes (id) on delete set null,
  result_status text not null default 'pending' check (result_status in ('pending', 'created', 'updated', 'skipped', 'failed')),
  result_message text,
  result_entity_id uuid,
  unique (batch_id, row_number)
);
create index import_rows_batch_idx on public.import_rows (batch_id, row_number);

create table public.field_mapping_presets (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 120),
  kind text not null check (kind in ('athletes', 'combine_results')),
  mapping jsonb not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (kind, name)
);

-- source identifiers for future sync; Postgres is the source of truth after import
create table public.external_record_mappings (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null default 'athlete' check (entity_type in ('athlete')),
  entity_id uuid not null references public.athletes (id) on delete cascade,
  source_system text not null,
  external_id text not null,
  import_batch_id uuid references public.import_batches (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (entity_type, source_system, external_id)
);
create index external_record_mappings_entity_idx on public.external_record_mappings (entity_id);

create table public.combine_results (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes (id) on delete restrict,
  event_id uuid not null references public.events (id) on delete restrict,
  test_type_id uuid not null references public.combine_test_types (id) on delete restrict,
  value numeric(8, 3) not null check (value > 0),
  unit text not null,
  attempt_number int not null default 1 check (attempt_number between 1 and 10),
  protocol text not null default 'standard',
  tested_on date,
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'verified', 'rejected')),
  verified_by uuid references auth.users (id) on delete set null,
  verified_at timestamptz,
  is_current boolean not null default true,
  supersedes_id uuid references public.combine_results (id) on delete set null,
  source text not null default 'manual' check (source in ('manual', 'import', 'jotform')),
  import_batch_id uuid references public.import_batches (id) on delete set null,
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index combine_results_attempt_uidx
  on public.combine_results (athlete_id, event_id, test_type_id, attempt_number, protocol)
  where is_current;
create index combine_results_lookup_idx on public.combine_results (test_type_id, verification_status) where is_current;
create index combine_results_athlete_idx on public.combine_results (athlete_id);
create index combine_results_event_idx on public.combine_results (event_id);
create trigger combine_results_updated before update on public.combine_results
  for each row execute function public.set_updated_at();
create trigger combine_results_audit after insert or update on public.combine_results
  for each row execute function public.audit_row_change();

create function public.combine_results_guard() returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_type public.combine_test_types;
begin
  if tg_op = 'INSERT' then
    select * into v_type from public.combine_test_types where id = new.test_type_id;
    if v_type.id is null then
      raise exception 'Unknown test type';
    end if;
    if new.value < v_type.min_value or new.value > v_type.max_value then
      raise exception 'Value % is outside the plausible range % to % for %', new.value, v_type.min_value, v_type.max_value, v_type.name
        using errcode = '22003';
    end if;
    new.unit := v_type.unit;
    if new.verification_status = 'verified' then
      if not public.is_admin() then
        raise exception 'Only an admin or owner can verify results' using errcode = '42501';
      end if;
      new.verified_by := auth.uid();
      new.verified_at := now();
    end if;
    return new;
  end if;

  -- UPDATE: measurements are immutable history; only verification state, currency and notes may change.
  if new.athlete_id is distinct from old.athlete_id or new.event_id is distinct from old.event_id
     or new.test_type_id is distinct from old.test_type_id or new.value is distinct from old.value
     or new.unit is distinct from old.unit or new.attempt_number is distinct from old.attempt_number
     or new.protocol is distinct from old.protocol or new.tested_on is distinct from old.tested_on then
    raise exception 'Combine measurements are immutable; record a correction instead' using errcode = 'P0001';
  end if;
  if new.verification_status is distinct from old.verification_status then
    if not public.is_admin() then
      raise exception 'Only an admin or owner can change verification status' using errcode = '42501';
    end if;
    if new.verification_status = 'verified' then
      new.verified_by := auth.uid();
      new.verified_at := now();
    else
      new.verified_by := null;
      new.verified_at := null;
    end if;
  end if;
  return new;
end;
$$;
create trigger combine_results_guard before insert or update on public.combine_results
  for each row execute function public.combine_results_guard();

-- Corrections never overwrite: the old row is retired (is_current = false) and a new row is inserted.
create function public.correct_combine_result(p_id uuid, p_value numeric, p_notes text default null)
returns uuid
language plpgsql set search_path = public, pg_temp
as $$
declare
  v_old public.combine_results;
  v_new uuid;
begin
  if not public.is_staff() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  select * into v_old from public.combine_results where id = p_id and is_current for update;
  if v_old.id is null then
    raise exception 'Result not found or already superseded';
  end if;
  update public.combine_results set is_current = false where id = v_old.id;
  insert into public.combine_results
    (athlete_id, event_id, test_type_id, value, unit, attempt_number, protocol, tested_on, source, notes, supersedes_id, created_by)
  values
    (v_old.athlete_id, v_old.event_id, v_old.test_type_id, p_value, v_old.unit, v_old.attempt_number, v_old.protocol,
     v_old.tested_on, 'manual', coalesce(p_notes, 'Correction of ' || v_old.id::text), v_old.id, auth.uid())
  returning id into v_new;
  return v_new;
end;
$$;

-- Rankings (editorial, admin approved) ---------------------------------------
create table public.rankings (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  description text,
  criteria text not null check (length(btrim(criteria)) >= 10),
  graduation_year int,
  position text,
  region text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  approved_by uuid references auth.users (id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rankings_published_needs_approval check (status <> 'published' or (approved_at is not null and published_at is not null))
);
create trigger rankings_updated before update on public.rankings
  for each row execute function public.set_updated_at();
create trigger rankings_audit after insert or update or delete on public.rankings
  for each row execute function public.audit_row_change();

create table public.ranking_entries (
  id uuid primary key default gen_random_uuid(),
  ranking_id uuid not null references public.rankings (id) on delete cascade,
  athlete_id uuid not null references public.athletes (id) on delete restrict,
  rank int not null check (rank >= 1),
  note text,
  unique (ranking_id, athlete_id)
);
create index ranking_entries_rank_idx on public.ranking_entries (ranking_id, rank);

-- News ----------------------------------------------------------------------
create table public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (length(btrim(title)) between 1 and 200),
  summary text check (summary is null or length(summary) <= 500),
  cover_image_path text,
  body_html text not null default '',
  author_name text,
  category text not null default 'football_news'
    check (category in ('athlete_spotlight', 'combine_recap', 'interview', 'football_news', 'event_announcement', 'rankings_update', 'development')),
  featured boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index articles_public_idx on public.articles (published_at desc) where status = 'published';
create trigger articles_updated before update on public.articles
  for each row execute function public.set_updated_at();
create trigger articles_audit after insert or update or delete on public.articles
  for each row execute function public.audit_row_change();

create function public.articles_publish_stamp() returns trigger
language plpgsql as $$
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;
create trigger articles_publish_stamp before insert or update on public.articles
  for each row execute function public.articles_publish_stamp();

-- Membership (Stripe-ready data model only; no payment processing exists yet) --
create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  athlete_id uuid references public.athletes (id) on delete set null,
  plan text not null default 'next_gen_plus',
  status text not null default 'inactive' check (status in ('inactive', 'active', 'past_due', 'canceled')),
  stripe_customer_id text,
  stripe_subscription_id text unique,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index memberships_user_idx on public.memberships (user_id);
create trigger memberships_updated before update on public.memberships
  for each row execute function public.set_updated_at();

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  bucket text not null,
  path text not null,
  alt_text text,
  mime_type text,
  size_bytes bigint,
  kind text,
  uploaded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (bucket, path)
);

-- Inbound forms -------------------------------------------------------------
create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('contact', 'partnership', 'membership_interest')),
  name text not null check (length(btrim(name)) between 1 and 160),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(email) <= 254),
  organization text check (organization is null or length(organization) <= 200),
  phone text check (phone is null or length(phone) <= 40),
  message text check (message is null or length(message) <= 5000),
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'new' check (status in ('new', 'in_progress', 'closed')),
  created_at timestamptz not null default now()
);
create index inquiries_status_idx on public.inquiries (status, created_at desc);

create table public.data_requests (
  id uuid primary key default gen_random_uuid(),
  request_type text not null check (request_type in ('correction', 'withdraw_consent', 'deletion', 'access')),
  athlete_reference text check (athlete_reference is null or length(athlete_reference) <= 300),
  athlete_id uuid references public.athletes (id) on delete set null,
  requester_name text not null check (length(btrim(requester_name)) between 1 and 160),
  requester_email text not null check (requester_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(requester_email) <= 254),
  details text check (details is null or length(details) <= 5000),
  status text not null default 'received' check (status in ('received', 'verifying', 'in_progress', 'completed', 'rejected')),
  handled_by uuid references auth.users (id) on delete set null,
  handled_at timestamptz,
  due_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now()
);
create index data_requests_status_idx on public.data_requests (status, created_at desc);
create trigger data_requests_audit after update on public.data_requests
  for each row execute function public.audit_row_change();
