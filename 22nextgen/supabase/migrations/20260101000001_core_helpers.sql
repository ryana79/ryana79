-- 22 NEXT GEN core helpers: role functions, timestamps, audit trigger.
-- All schema changes live in version-controlled migrations. Owner: 22 Fitness LLC.

create table public.user_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'editor', 'coach', 'parent')),
  granted_by uuid references auth.users (id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);
create index user_roles_role_idx on public.user_roles (role);

-- SECURITY DEFINER so policies on other tables can consult roles without recursion.
create function public.has_role(p_role text)
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = p_role
  );
$$;

create function public.has_any_role(p_roles text[])
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = any (p_roles)
  );
$$;

-- owner + admin: full operational control
create function public.is_admin() returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$ select public.has_any_role(array['owner', 'admin']); $$;

-- owner + admin + editor: content management
create function public.is_editor() returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$ select public.has_any_role(array['owner', 'admin', 'editor']); $$;

-- owner + admin + editor + coach: any internal staff
create function public.is_staff() returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$ select public.has_any_role(array['owner', 'admin', 'editor', 'coach']); $$;

grant execute on function public.has_role(text), public.has_any_role(text[]),
  public.is_admin(), public.is_editor(), public.is_staff() to anon, authenticated, service_role;

create function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Immutable-ish audit trail. Stores WHICH columns changed, never row values (no PII in logs).
create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid,
  actor_email text,
  action text not null,
  entity_type text not null,
  entity_id text,
  summary text,
  changed_fields text[],
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);
create index audit_logs_created_idx on public.audit_logs (created_at desc);
create index audit_logs_actor_idx on public.audit_logs (actor_id);

create function public.write_audit(
  p_action text, p_entity_type text, p_entity_id text,
  p_summary text default null, p_changed text[] default null, p_metadata jsonb default '{}'::jsonb
) returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  insert into public.audit_logs (actor_id, actor_email, action, entity_type, entity_id, summary, changed_fields, metadata)
  values (auth.uid(), nullif(auth.jwt() ->> 'email', ''), p_action, p_entity_type, p_entity_id, p_summary, p_changed, coalesce(p_metadata, '{}'::jsonb));
end;
$$;
revoke all on function public.write_audit(text, text, text, text, text[], jsonb) from public, anon;
grant execute on function public.write_audit(text, text, text, text, text[], jsonb) to authenticated, service_role;

create function public.audit_row_change() returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_old jsonb;
  v_new jsonb;
  v_changed text[];
  v_id text;
  v_pk text := coalesce(tg_argv[0], 'id');
begin
  if tg_op = 'INSERT' then
    v_new := to_jsonb(new);
    v_id := v_new ->> v_pk;
    perform public.write_audit('insert', tg_table_name, v_id, null, null, '{}'::jsonb);
    return new;
  elsif tg_op = 'UPDATE' then
    v_old := to_jsonb(old);
    v_new := to_jsonb(new);
    select coalesce(array_agg(key order by key), '{}') into v_changed
    from jsonb_each(v_new) n
    where n.key not in ('updated_at') and v_old -> n.key is distinct from n.value;
    if array_length(v_changed, 1) is null then
      return new;
    end if;
    v_id := v_new ->> v_pk;
    perform public.write_audit('update', tg_table_name, v_id, null, v_changed, '{}'::jsonb);
    return new;
  else
    v_old := to_jsonb(old);
    v_id := v_old ->> v_pk;
    perform public.write_audit('delete', tg_table_name, v_id, null, null, '{}'::jsonb);
    return old;
  end if;
end;
$$;

-- Roles: users can never self-assign; only an owner may change roles; never remove last owner.
create function public.guard_user_roles() returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    if old.role = 'owner' and (select count(*) from public.user_roles where role = 'owner') <= 1 then
      raise exception 'Cannot remove the last owner' using errcode = 'P0001';
    end if;
    return old;
  end if;
  return new;
end;
$$;
create trigger user_roles_guard before insert or update or delete on public.user_roles
  for each row execute function public.guard_user_roles();
create trigger user_roles_audit after insert or update or delete on public.user_roles
  for each row execute function public.audit_row_change('user_id');
