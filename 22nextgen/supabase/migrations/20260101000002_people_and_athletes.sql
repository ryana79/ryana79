-- Profiles, guardians, athletes, private athlete data, consents.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, nullif(left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 120), ''))
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Future guardian dashboards: one guardian manages many athletes.
create table public.guardians (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users (id) on delete set null,
  full_name text not null,
  email text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger guardians_updated before update on public.guardians
  for each row execute function public.set_updated_at();

-- Athletes: every column here is safe to show publicly ONCE a row is approved + public.
-- Anything sensitive lives in athlete_private. Public visibility is also gated by a trigger.
create table public.athletes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  first_name text not null check (length(btrim(first_name)) between 1 and 80),
  last_name text not null check (length(btrim(last_name)) between 1 and 80),
  display_name text check (display_name is null or length(display_name) <= 120),
  profile_image_path text,
  graduation_year int check (graduation_year between 2025 and 2045),
  current_grade int check (current_grade between 1 and 12),
  primary_position text,
  secondary_position text,
  team text,
  school_public text,
  town text,
  state text check (state is null or state ~ '^[A-Z]{2}$'),
  region text,
  height_in numeric(4, 1) check (height_in is null or height_in between 30 and 96),
  weight_lb numeric(5, 1) check (weight_lb is null or weight_lb between 30 and 450),
  highlight_urls text[] not null default '{}',
  awards text[] not null default '{}',
  achievements text[] not null default '{}',
  bio text check (bio is null or length(bio) <= 4000),
  profile_status text not null default 'draft'
    check (profile_status in ('draft', 'pending_review', 'approved', 'rejected', 'archived')),
  featured boolean not null default false,
  featured_rank int,
  consent_status text not null default 'none'
    check (consent_status in ('none', 'pending', 'granted', 'withdrawn', 'declined')),
  public_visibility boolean not null default false,
  approved_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint athletes_public_requires_approval check (not public_visibility or profile_status = 'approved')
);
create index athletes_public_idx on public.athletes (last_name, first_name) where public_visibility;
create index athletes_name_idx on public.athletes (lower(last_name), lower(first_name));
create index athletes_class_idx on public.athletes (graduation_year);
create index athletes_status_idx on public.athletes (profile_status);
create index athletes_featured_idx on public.athletes (featured_rank) where featured;
create trigger athletes_updated before update on public.athletes
  for each row execute function public.set_updated_at();

create function public.athletes_default_slug() returns trigger
language plpgsql as $$
declare
  v_base text;
  v_slug text;
begin
  if new.slug is null or new.slug = '' then
    v_base := regexp_replace(lower(btrim(new.first_name || '-' || new.last_name)), '[^a-z0-9]+', '-', 'g');
    v_base := btrim(v_base, '-');
    if v_base = '' then v_base := 'athlete'; end if;
    loop
      v_slug := v_base || '-' || substr(md5(random()::text || clock_timestamp()::text), 1, 5);
      exit when not exists (select 1 from public.athletes where slug = v_slug);
    end loop;
    new.slug := v_slug;
  end if;
  return new;
end;
$$;
-- slug column is NOT NULL, so supply a placeholder default the trigger replaces.
alter table public.athletes alter column slug set default '';
create trigger athletes_slug before insert on public.athletes
  for each row execute function public.athletes_default_slug();

create table public.athlete_private (
  athlete_id uuid primary key references public.athletes (id) on delete cascade,
  birth_date date,
  school text,
  parent_name text,
  parent_email text,
  parent_phone text,
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index athlete_private_parent_email_idx on public.athlete_private (lower(parent_email));
create trigger athlete_private_updated before update on public.athlete_private
  for each row execute function public.set_updated_at();

create table public.guardian_athletes (
  guardian_id uuid not null references public.guardians (id) on delete cascade,
  athlete_id uuid not null references public.athletes (id) on delete cascade,
  relationship text,
  can_manage_profile boolean not null default true,
  can_view_results boolean not null default true,
  verified_at timestamptz,
  verified_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (guardian_id, athlete_id)
);

-- Consent history is append-only; the latest row for a scope is the current consent.
create table public.athlete_consents (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes (id) on delete cascade,
  scope text not null default 'public_profile' check (scope in ('public_profile')),
  status text not null check (status in ('pending', 'granted', 'withdrawn', 'declined')),
  guardian_name text,
  guardian_relationship text,
  method text check (method in ('signed_form', 'email_confirmation', 'electronic_signature', 'other')),
  verifiable_parental_consent boolean not null default false,
  evidence_note text,
  document_path text,
  recorded_by uuid references auth.users (id) on delete set null,
  recorded_at timestamptz not null default now(),
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  constraint consent_granted_needs_guardian check (status <> 'granted' or guardian_name is not null)
);
create index athlete_consents_athlete_idx on public.athlete_consents (athlete_id, recorded_at desc);

create function public.latest_consent(p_athlete uuid)
returns public.athlete_consents
language sql stable security definer set search_path = public, pg_temp
as $$
  select c.* from public.athlete_consents c
  where c.athlete_id = p_athlete and c.scope = 'public_profile'
  order by c.recorded_at desc, c.id desc limit 1;
$$;

-- Conservative age gate: unknown age is treated as possibly under 13.
create function public.athlete_may_be_under_13(p_athlete uuid)
returns boolean
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare
  v_birth date;
  v_grade int;
  v_grad int;
  v_end_year int;
begin
  select birth_date into v_birth from public.athlete_private where athlete_id = p_athlete;
  if v_birth is not null then
    return age(current_date, v_birth) < interval '13 years';
  end if;
  select current_grade, graduation_year into v_grade, v_grad from public.athletes where id = p_athlete;
  if v_grade is not null then
    return v_grade <= 7;
  end if;
  if v_grad is not null then
    v_end_year := extract(year from current_date)::int + case when extract(month from current_date) >= 7 then 1 else 0 end;
    return (12 - (v_grad - v_end_year)) <= 7;
  end if;
  return true;
end;
$$;

create table public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  is_public boolean not null default false,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);
create trigger site_settings_audit after insert or update or delete on public.site_settings
  for each row execute function public.audit_row_change('key');

-- Publication guard: DB-level enforcement of the youth-privacy rules.
create function public.athletes_publication_guard() returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_consent public.athlete_consents;
  v_was_published boolean := false;
  v_coppa_ok boolean := false;
begin
  if tg_op = 'UPDATE' then
    v_was_published := old.public_visibility and old.profile_status = 'approved';
  end if;

  if new.profile_status <> 'approved' then
    new.public_visibility := false;
    new.featured := false;
    new.featured_rank := null;
    return new;
  end if;

  if not (tg_op = 'UPDATE' and old.profile_status = 'approved') then
    if not public.is_admin() then
      raise exception 'Only an admin or owner can approve an athlete profile' using errcode = '42501';
    end if;
    new.approved_at := now();
  end if;

  if new.public_visibility or new.profile_status = 'approved' then
    v_consent := public.latest_consent(new.id);
    if v_consent.id is null or v_consent.status <> 'granted' then
      raise exception 'Cannot approve a profile without recorded, granted parental/guardian consent' using errcode = 'P0001';
    end if;
    if public.athlete_may_be_under_13(new.id) then
      select coalesce((value ->> 'workflow_approved')::boolean, false) into v_coppa_ok
      from public.site_settings where key = 'coppa';
      if not coalesce(v_coppa_ok, false) or not v_consent.verifiable_parental_consent then
        raise exception 'Profiles for athletes under 13 (or of unknown age) cannot be published until an approved COPPA verifiable-parental-consent workflow is enabled and recorded' using errcode = 'P0001';
      end if;
    end if;
  end if;

  if new.featured and not new.public_visibility then
    new.featured := false;
    new.featured_rank := null;
  end if;
  return new;
end;
$$;
create trigger athletes_publication before insert or update on public.athletes
  for each row execute function public.athletes_publication_guard();
create trigger athletes_audit after insert or update or delete on public.athletes
  for each row execute function public.audit_row_change();
create trigger athlete_private_audit after insert or update or delete on public.athlete_private
  for each row execute function public.audit_row_change('athlete_id');

-- Recording a consent keeps athletes.consent_status in sync; withdrawal immediately unpublishes.
create function public.athlete_consent_applied() returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  update public.athletes
  set consent_status = new.status,
      public_visibility = case when new.status = 'granted' then public_visibility else false end,
      featured = case when new.status = 'granted' then featured else false end,
      profile_status = case
        when new.status = 'granted' then profile_status
        when profile_status = 'approved' then 'pending_review'
        else profile_status end
  where id = new.athlete_id;
  perform public.write_audit('consent_' || new.status, 'athlete_consents', new.id::text, null, null,
    jsonb_build_object('athlete_id', new.athlete_id, 'verifiable', new.verifiable_parental_consent));
  return new;
end;
$$;
create trigger athlete_consents_apply after insert on public.athlete_consents
  for each row execute function public.athlete_consent_applied();

-- Consent rows are an append-only evidence trail (deletion only via athlete erasure cascade).
create function public.block_mutation() returns trigger
language plpgsql as $$
begin
  raise exception '% rows are append-only', tg_table_name using errcode = 'P0001';
end;
$$;
create trigger athlete_consents_no_update before update on public.athlete_consents
  for each row execute function public.block_mutation();
create trigger audit_logs_no_update before update or delete on public.audit_logs
  for each row execute function public.block_mutation();
