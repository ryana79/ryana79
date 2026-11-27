# 22 NEXT GEN implementation plan and checklist

Owner: 22 Fitness LLC. Scope covers Phases 1 and 2 as working software and Phase 3 as data model plus architecture only.

## Approach

1. Database first. Every table, policy, trigger and function lives in `supabase/migrations`. Privacy rules (consent, age, publication, verification) are enforced in Postgres so no UI or script can bypass them.
2. Server-side authorization on every action and route (`assertCapability`), with RLS as the final authority.
3. Public pages read only what an anonymous client is allowed to read. Admin pages use the signed-in user's session (RLS applies). The service-role key is limited to the Jotform webhook, the owner bootstrap script and role lookup.
4. Admin-editable content (homepage sections, membership copy, contact info, sponsor packages) is stored in `site_settings`, so changes need no code deploy.
5. Test the rules that matter: unit tests for pure logic, in-process Postgres (PGlite) tests for RLS, triggers and SQL functions, and a route-level test for the webhook.

## Phase 1 checklist (foundation, events, content)

- [x] Next.js 16 / TypeScript / Tailwind / shadcn / Lucide / Motion project, brand tokens, Barlow Condensed + Inter
- [x] Desktop header with dropdowns, mobile menu, footer ("Powered by 22 Fitness")
- [x] Homepage with eight admin-editable, individually hideable sections
- [x] Public routes: events, event detail, athletes, rankings, combine results, news, membership, partners, about, contact, login, register, privacy, terms, sitemap, robots, 404
- [x] Schema, RLS, storage buckets, seed configuration (no invented events, athletes or results)
- [x] Auth, owner bootstrap script, roles and capability checks
- [x] Event management: create, edit, publish, unpublish, archive, delete; image upload; Jotform URL/ID validation and embed with fallback; price warning; JSON-LD
- [x] Sponsors/partners, news with sanitized rich text, site content editor, contact and partner inquiry forms, privacy request form
- [x] SEO (metadata, canonical, Open Graph, sitemap, robots), GA4 behind a consent banner with allowlisted parameters
- [x] Mobile layouts checked at 390 px; empty and failed-integration states

## Phase 2 checklist (athletes, imports, results, rankings)

- [x] Athlete tables with separate private data; admin create/edit/search/filter/archive; consent recording and withdrawal; approve/unpublish workflow
- [x] Public directory with search and filters; recruiting-style profile; branded player card; highlight links (https only, YouTube/Vimeo embeds)
- [x] Spreadsheet import for athletes and combine results (sheet choice, mapping with auto-detect and presets, validation, duplicate detection, per-row decisions, modes, history, error export, purge)
- [x] Combine test types (built-in and admin-managed), result entry, verification, corrections that preserve history
- [x] Leaderboards (verified only, best result per athlete, one protocol at a time) on the homepage and `/combine-results`
- [x] Editorial rankings with admin approval, separate from combine data
- [x] Registrations from Jotform with review queue, candidate matching, manual link/create-draft/ignore, manual payment confirmation
- [x] Exports (athletes, private athlete fields, registrations, results) with formula-injection protection and audit entries
- [x] Audit log, privacy requests queue, erasure function

## Phase 3 (model and architecture only)

See `docs/PHASE3_ARCHITECTURE.md`. Tables exist for guardians, guardian-to-athlete links and memberships; `/dashboard/*` routes are authenticated scaffolds with no billing or self-service behavior.

## Verification matrix

| Area | How it is checked |
| --- | --- |
| Event CRUD and role limits | `tests/db/security.test.ts` |
| Admin authorization, last-owner protection, audit forgery | `tests/db/security.test.ts`, `tests/unit/lib.test.ts` (capabilities) |
| Anonymous/restricted access | `tests/db/security.test.ts` |
| Consent, under-13, publication, withdrawal | `tests/db/security.test.ts` |
| Combine range, immutability, verification, corrections | `tests/db/security.test.ts` |
| Leaderboard sorting, ties, protocols | `tests/unit/lib.test.ts` |
| Spreadsheet parsing, mapping, normalization, duplicates | `tests/unit/import.test.ts`, `tests/unit/lib.test.ts` |
| Import apply modes, overwrite protection | `tests/db/security.test.ts` |
| Jotform parsing, dedupe, auth, SSRF guard | `tests/unit/lib.test.ts`, `tests/unit/webhook-route.test.ts`, `tests/db/security.test.ts` |
| Browser flows (admin to public) | Manual Playwright runs recorded in `IMPLEMENTATION_STATUS.md` (not part of CI) |
