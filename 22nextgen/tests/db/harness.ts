import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * Minimal stand-in for the parts of Supabase the migrations rely on (roles, auth.* helpers, storage tables),
 * so RLS, triggers and SQL functions can be tested without Docker. Row-level security is enforced for the
 * `anon` and `authenticated` roles exactly as on Supabase; `postgres` (superuser) plays the service role.
 */
const BOOTSTRAP = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text unique, raw_user_meta_data jsonb default '{}'::jsonb);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
create function auth.role() returns text language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon') $$;
create schema storage;
create table storage.buckets (id text primary key, name text, public boolean default false, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;
grant usage on schema public, auth, storage to anon, authenticated, service_role;
grant select on all tables in schema storage to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
`;

export type Db = PGlite;

export async function createDb(): Promise<Db> {
  const db = new PGlite();
  await db.exec(BOOTSTRAP);
  const dir = path.resolve(__dirname, "../../supabase/migrations");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(path.join(dir, file), "utf8"));
  }
  return db;
}

export type Actor = { id: string; email?: string } | null;

/** Runs `fn` with the session switched to the given Supabase role and JWT subject, then resets it. */
export async function as<T>(db: Db, actor: Actor | "service", fn: () => Promise<T>): Promise<T> {
  const role = actor === "service" ? "service_role" : actor ? "authenticated" : "anon";
  const sub = actor && actor !== "service" ? actor.id : "";
  const claims = actor && actor !== "service" ? JSON.stringify({ sub: actor.id, role, email: actor.email ?? "" }) : JSON.stringify({ role });
  await db.query("select set_config('request.jwt.claim.sub', $1, false), set_config('request.jwt.claims', $2, false), set_config('request.jwt.claim.role', $3, false)", [sub, claims, role]);
  await db.exec(`set role ${role}`);
  try {
    return await fn();
  } finally {
    await db.exec("reset role");
  }
}

export async function addUser(db: Db, email: string, roles: string[] = []): Promise<{ id: string; email: string }> {
  const res = await db.query<{ id: string }>("insert into auth.users (email) values ($1) returning id", [email]);
  const id = res.rows[0].id;
  for (const role of roles) await db.query("insert into public.user_roles (user_id, role) values ($1, $2)", [id, role]);
  return { id, email };
}
