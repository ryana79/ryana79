# 22 NEXT GEN

**THE FUTURE STARTS HERE.** Compete. Develop. Get Discovered.

Web platform for 22 NEXT GEN, powered by 22 Fitness LLC: New Jersey youth football events, athlete exposure, combine testing and performance tracking.

Stack: Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · shadcn/ui (Base UI) · Lucide · Motion · Supabase (Postgres, Auth, Storage, RLS) · Zod + React Hook Form · ExcelJS · Tiptap · Vitest.

Status and known gaps: see [`IMPLEMENTATION_STATUS.md`](./IMPLEMENTATION_STATUS.md). Plan and checklist: [`docs/IMPLEMENTATION_PLAN.md`](./docs/IMPLEMENTATION_PLAN.md). Phase 3 design: [`docs/PHASE3_ARCHITECTURE.md`](./docs/PHASE3_ARCHITECTURE.md).

> This app lives in the `22nextgen/` folder of the repository. Run every command below from that folder.

## Requirements

- Node.js 22 or newer and npm
- A Supabase project (hosted) **or** the Supabase CLI plus Docker for a local stack
- Optional: Jotform account (API key), GA4 property

## Local setup

```bash
cd 22nextgen
npm install
cp .env.example .env.local
```

### 1. Start Supabase locally

```bash
npx supabase init          # only if supabase/config.toml does not exist yet; keeps the existing migrations folder
npx supabase start         # needs Docker; prints API URL, anon key and service_role key
npx supabase db reset      # applies every file in supabase/migrations and seeds default site settings
```

Copy the printed values into `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service_role key>
```

For a hosted project instead: create the project, run `npx supabase link --project-ref <ref>` then `npx supabase db push`, and use the project URL and keys from Project Settings > API.

### 2. Create the first Owner

The first Owner cannot be created through the website. Run once from a trusted machine:

```bash
OWNER_EMAIL=you@example.com OWNER_PASSWORD='a-long-random-passphrase' npm run bootstrap:owner
```

The script refuses to run if an Owner already exists. Owners grant further roles (Admin, Editor, Coach) in **Admin > Settings > Team & roles** (the person must register an account first). Remove `OWNER_PASSWORD` from your environment afterwards.

### 3. Run

```bash
npm run dev       # http://localhost:3000
```

Log in at `/login`, then open `/admin`. A fresh database has no events, athletes, sponsors or results; everything is entered through the admin or imported from a spreadsheet.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest: unit tests plus in-process Postgres (PGlite) database and RLS tests. No Docker needed. |
| `npm run bootstrap:owner` | Create the first Owner (see above) |

## Environment variables

All names are listed with comments in [`.env.example`](./.env.example). Required for the site to function: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`. Required for registrations: `SUPABASE_SERVICE_ROLE_KEY`, `JOTFORM_API_KEY`, `JOTFORM_WEBHOOK_SECRET`. Without Supabase configured the public site renders empty states instead of crashing.

## Jotform setup

1. In the admin, edit an event and paste the Jotform form URL or numeric ID (Registration section). The form is embedded on the event page with a fallback link. Editing the displayed price does **not** change the amount charged by Jotform; change it in Jotform too.
2. In Jotform: Form Settings > Integrations > WebHooks, add `https://YOUR-DOMAIN/api/webhooks/jotform?token=<JOTFORM_WEBHOOK_SECRET>`.
3. Set `JOTFORM_API_KEY` (read access) and `JOTFORM_WEBHOOK_SECRET`.

How the webhook behaves: the request body is never trusted. Only numeric form and submission IDs are read; the full submission is fetched from Jotform with your API key and checked against those IDs. The form must belong to a configured event. Submissions are de-duplicated by Jotform submission ID, stored privately and shown in **Admin > Registrations** for review. Payment status is always stored as `unverified` and is only changed by an admin (no payment source is connected). Likely athlete matches are suggested, never linked automatically.

## Spreadsheet import

**Admin > Imports** accepts `.xlsx` and `.csv` (up to 5 MB and 10,000 rows) for athletes or combine results. Choose a worksheet, review the auto-detected column mapping (save it as a preset), preview validation and duplicate detection, resolve uncertain matches row by row, then apply with a mode: add new, update matched, add and update, or preview only. A template workbook can be downloaded from the same page. Imported athletes are always created as drafts with no consent and are never published by an import. Approved profile data is preserved unless you explicitly allow overwriting. Raw spreadsheet cells can be purged after an import.

## Deploying

### Supabase (hosted)

1. Create a project. In Authentication > URL Configuration set **Site URL** to your production origin and add `https://YOUR-DOMAIN/**` (and your Vercel preview pattern) to **Redirect URLs**.
2. `npx supabase link --project-ref <ref>` then `npx supabase db push`.
3. Storage buckets `public-media` (public) and `private-docs` (private) are created by the migrations; confirm under Storage.
4. Enable email confirmations and configure SMTP (the built-in sender is rate limited) before accepting public sign-ups.
5. Run `npm run bootstrap:owner` against the production project.

### Vercel

1. Import the repository, set **Root Directory** to `22nextgen`.
2. Add the environment variables from `.env.example` (Production and Preview). Keep `SUPABASE_SERVICE_ROLE_KEY`, `JOTFORM_*` server-side only.
3. Deploy. Set `NEXT_PUBLIC_SITE_URL` to the final domain so canonical URLs, the sitemap and structured data are correct.
4. Add the Jotform webhook URL (above) using the production domain.

## Security notes

- Row Level Security is enabled on every table with default deny; server actions additionally check roles (defence in depth). Roles: Owner, Admin, Editor, Coach (Parent is reserved for a future dashboard).
- Youth privacy is enforced in the database, not only the UI: a profile cannot be published without recorded guardian consent; athletes under 13 or of unknown age cannot be published until an owner enables the COPPA workflow setting; withdrawing consent unpublishes immediately; consent and audit logs are append-only.
- The service-role key is used only by the Jotform webhook, the bootstrap script and role lookups.
- Uploaded images are verified by file signature, size-limited and stored under random names.
- CSV exports neutralise spreadsheet formulas and are audit-logged.

Privacy, consent, retention and COPPA wording in the product is draft and must be reviewed by legal counsel before launch.
