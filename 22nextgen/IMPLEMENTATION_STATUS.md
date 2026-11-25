# Implementation status

Last updated with the Phase 1 + Phase 2 pull request. Phase 3 is data model and architecture only.

## Test results

| Check | Result |
| --- | --- |
| `npm run typecheck` | passes |
| `npm run lint` | passes, no warnings |
| `npm test` | 101 tests pass in 5 files (unit, webhook route, PGlite database/RLS) |
| `npm run build` | passes (Next.js 16.4.6) |
| Browser run against a real local Postgres + GoTrue + PostgREST + Storage stack (Playwright, Chrome) | Acceptance flow passed end to end; details below |

Not verified: `supabase start` itself (the build machine has no Docker), the live Jotform API, a hosted Supabase project, a Vercel deployment, GA4 delivery to Google.

### What the browser run covered

The import, consent, results, news, content and export flows ran against the development server. The role-gating, ranking, GA4 consent, contact/privacy/registration and mobile sweeps ran on a production build (`next build && next start`).

- Owner login; staff roles: editor, coach and a signed-in user with no role were each checked against admin pages, the export route and the upload route (all correctly denied); signed-out visitors redirect to login.
- Sponsor created with logo upload; non-image upload (a PHP file named `.png`) rejected with 415.
- Event created with hero upload, price, Jotform form ID, published; appears on `/events`, the event page and the homepage; JSON-LD `SportsEvent` with correct `-04:00` offset; unpublish and archive remove it from public pages.
- Spreadsheet import: two-sheet workbook (sheet picker), auto-detected mapping, preview with an in-file duplicate and an invalid row, apply; re-importing the same file matched 4 existing athletes and created 0 new ones; an ambiguous name match was left unresolved and skipped on apply (never merged) and could be linked or created by choosing an option.
- Consent: approving without consent blocked; consent recorded then approved and published; an under-13 athlete blocked with a clear message; public profile page contains no birth date, parent email, phone or guardian name.
- Combine results import with event, ambiguous rows resolved by linking, invalid rows (non-numeric, implausible 1.2 s 40-yard dash) rejected; "verify all for this event"; public leaderboards show only verified results of public athletes, sorted correctly (lower is better for the 40-yard dash).
- Rankings: created, published with approver recorded, public page shows only public athletes.
- News article published; homepage headline edited in Site content and changed immediately; sponsor removed.
- CSV exports for athletes (public and private fields), registrations and results; anonymous export request returns 401.
- Contact and privacy request forms store rows visible only to admins; parent registration creates a profile with no roles.
- GA4: with a measurement ID the consent banner appears; no Google request is made before acceptance or after declining; requests start only after accepting.
- Public pages and the 404 page at 1440 px and 390 px: no console errors, one `h1` each, no horizontal overflow; admin pages checked at 390 px.

### What the automated tests cover

- `tests/db/security.test.ts` (36, PGlite running the real migrations with Supabase roles and `auth.*` stubs): anon and role-limited reads/writes, event create/update/delete by role, owner-only role grants, last-owner protection, audit forgery blocked and audit contents free of row values, consent gate, under-13/unknown-age gate and owner-only COPPA toggle, withdrawal unpublishes, append-only consent and audit logs, combine range check, immutability, admin-only verification, correction history, public visibility of results, import apply modes and approved-profile protection, ambiguous rows never merged, admin-only import, Jotform submission dedupe, erasure.
- `tests/unit/lib.test.ts`: leaderboard sorting/ties/protocols, combine value validation, matching rules, Jotform ID/URL parsing, webhook token, hints, SSRF guard and field extraction (including skipped sensitive and payment fields), capabilities, CSV formula protection, rich-text sanitizing, image signature sniffing, video link rules, analytics parameter allowlist.
- `tests/unit/webhook-route.test.ts`: the webhook route with a fake database and stubbed Jotform API: auth, dedupe, form not linked to an event, ID mismatch, upstream failure, SSRF guard, payment always `unverified`, body fields never stored.
- `tests/unit/import.test.ts` (23): spreadsheet parsing (xlsx/csv), column auto-detection, normalization, preview, duplicates.
- `tests/unit/events.test.ts`: event JSON-LD, date/price formatting, event form validation and row mapping.

Bugs found and fixed by this testing are listed in the pull request description.

## Completed

See `docs/IMPLEMENTATION_PLAN.md` for the full Phase 1 and Phase 2 checklist. Everything listed there is implemented and was exercised as described above, except the items under "Needs credentials" and "Known limitations".

## Needs credentials or decisions from the owner

| Item | Needed from | Notes |
| --- | --- | --- |
| Supabase project (URL, anon key, service-role key) | Owner | Run migrations with `supabase db push`, then `npm run bootstrap:owner` |
| Jotform API key and webhook secret | Owner | Webhook has not been exercised against live Jotform; verify with one test submission |
| Jotform form IDs per event | Admin | Entered on each event |
| Payment verification source | Owner decision | No authorized payment source is connected, so registrations stay `unverified` and an admin confirms manually. Jotform's webhook payload alone is not treated as proof of payment |
| GA4 measurement ID | Owner | `NEXT_PUBLIC_GA_MEASUREMENT_ID`, set at build time on Vercel |
| Stripe keys | Later phase | Data model only |
| Transactional email / SMTP | Owner | Needed for Supabase auth emails in production |
| Athlete profile search indexing | Owner + counsel | `ATHLETE_PROFILES_INDEXABLE` defaults to off |
| COPPA workflow | Counsel, then Owner | Under-13 athletes cannot be published until the `coppa.workflow_approved` setting is turned on by an Owner |
| Privacy policy, terms, consent wording, retention periods, deletion process | Legal counsel | All drafted placeholders; flagged in the UI copy and here |

## Needs assets or content from the owner

- Licensed logos, photography and event graphics (the site uses a typographic wordmark and placeholder artwork; no unlicensed images are used)
- Real contact email, phone, address and social links (Admin > Site content > Contact; the contact page shows only what is filled in)
- Sponsor logos and package pricing confirmation
- Colin's spreadsheet: none was present in the repository, so the importer was exercised with generated sample workbooks. Please run the real file through Preview first; if its columns differ, the mapping step and presets handle renames, but unusual layouts (merged cells, multi-row headers) may need a tweak
- Combine test protocols you want enabled beyond the built-ins (40-yard dash, 10-yard split, 5-10-5, vertical, broad jump)

## Later phases (not built)

Guardian dashboards and self-service profile edits, Stripe checkout/portal/webhooks and entitlement checks, athlete media library, downloadable player cards, transactional email. Design is in `docs/PHASE3_ARCHITECTURE.md`. The `/dashboard/*` routes are sign-in-gated placeholders.

## Known limitations and risks

1. **No rate limiting.** Public forms (contact, privacy request, registration), login and the webhook have no rate limiting. Anonymous clients can also insert inquiries and privacy requests directly through the Supabase REST endpoint (insert-only RLS, field limits, honeypot on the forms). Add Vercel/WAF rate limits or a Supabase edge function before launch.
2. **Content Security Policy is minimal** (`frame-ancestors`, `base-uri`, `object-src`, `form-action`). A script-src policy needs nonces and was not added; GA4 and the Jotform iframe would need to be allowlisted.
3. **Leaderboards are computed in TypeScript** from verified results (up to 5,000 rows read per request, cached with ISR on most pages). Fine for early volumes; move to a SQL view or materialized view when the table grows.
4. **Athlete photos** are stored in the public `public-media` bucket under unguessable random names once uploaded. Anyone with the URL can fetch them. Only photos attached to a published profile are linked from the site, but the files are not access-controlled. Use signed URLs if counsel requires it.
5. **Hometown (town, state) is shown on public athlete profiles** when entered, with guardian consent and admin approval. This is city-level, not precise location. No school address or birth date is ever public. Counsel should confirm this is acceptable.
6. **Spreadsheet limits.** 5 MB and 10,000 rows. ExcelJS parses the whole workbook in memory; a deliberately crafted compressed workbook is bounded only by those caps and the serverless memory limit. Only admins can import.
7. **Webhook idempotency under concurrency** relies on the unique `jotform_submission_id` constraint; the second insert is reported as a duplicate. Delivery logs in `jotform_submissions` are not de-duplicated.
8. **Archived events remain readable to anonymous API clients** (needed so historical verified results keep their event context). Draft events are not.
9. **Stale ISR window.** Public pages revalidate every 60 seconds and are also invalidated after admin saves; a save on one serverless region may take up to a minute to appear everywhere.
10. **The local verification stack was not the Supabase CLI.** It used the same Postgres, GoTrue, PostgREST and Storage services without Docker. One difference found and handled: Storage's database role must be a member of `anon`, `authenticated` and `service_role` (the Supabase CLI and hosted projects already do this).
11. **`next start` against a local Supabase** blocks image optimization for `127.0.0.1` (Next's SSRF guard). Set `NEXT_IMAGE_ALLOW_LOCAL=true` for local production runs only.
12. Next.js 16, Tailwind 4, shadcn base-nova (Base UI) and Vitest 5 are newer than much public documentation; upgrades should be tested.
13. Browser tests are scripts run by hand during development, not part of CI.
14. An unexplained React "tree hydrated but some attributes of the server rendered HTML didn't match" warning appeared a few times in the development server after navigations on admin import pages. It did not reproduce on a clean load or in production builds (zero console errors across all public pages in a production build). Worth watching.
