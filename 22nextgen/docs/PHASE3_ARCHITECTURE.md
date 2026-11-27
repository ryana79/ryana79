# Phase 3: authenticated dashboards, memberships and media (architecture only)

Nothing in this document is implemented beyond the data model and route scaffolds listed under "Already in place".

## Already in place

- `guardians` (one row per parent/guardian account) and `guardian_athletes` (link with `can_manage_profile`, `can_view_results`, `verified_at`, `verified_by`). RLS lets a guardian read their own links; only admins write them.
- `memberships` (user, optional athlete, plan, status, `stripe_customer_id`, `stripe_subscription_id`, `current_period_end`). Users read their own row; writes are admin or service role only.
- `site_settings.membership` holds the NEXT GEN+ name, price (default $19.99/month) and benefit lists, editable in the admin. `billing_enabled` is `false`; the public page says billing is not live and takes no payment.
- Role `parent` exists in the role check constraint.
- `/dashboard`, `/dashboard/athletes`, `/dashboard/results`, `/dashboard/events`, `/dashboard/membership`, `/dashboard/media` require sign-in and show honest "coming soon" pages.

## Guardian dashboard

1. Registration creates an auth user and `profiles` row. A guardian row is created on first dashboard visit.
2. Linking a child: guardian submits a claim (name, class, birth date). An admin verifies against the registration or roster and sets `verified_at`. Until verified the guardian sees nothing about the athlete.
3. Guardians may edit only fields in a column allowlist (bio, highlight links, photo) through a server action that writes a pending change; admin approval publishes it. Consent withdrawal is a one-click action that inserts a `withdrawn` consent row, which already unpublishes the profile through the existing trigger.
4. Guardians read their athlete's verified and unverified results, registrations and consent history. They never see other families' data. New policies follow the `guardian_athletes` join.

## Billing (Stripe)

- Checkout Session created server-side for the `next_gen_plus` price; success never grants access by itself.
- A signed Stripe webhook (`STRIPE_WEBHOOK_SECRET`, raw-body verification, event-ID idempotency table) upserts `memberships.status` and `current_period_end` using the service role.
- Entitlement checks read `memberships` server-side. Cancellation and card updates go through the Stripe customer portal.
- Event registration payments stay in Jotform. If an authorized payment source is ever connected (for example Jotform's Stripe integration reporting through a verified channel), only that path may set `event_registrations.payment_status = 'verified'`.
- Open decision for the owner: whether memberships are per athlete or per guardian account (the table supports both through `athlete_id` nullable).

## Media

- Private bucket `private-docs` already exists for consent documents (admin only). A `media` library for NEXT GEN+ athletes would add `athlete_media` (athlete_id, kind, storage_path, status pending/approved/rejected, reviewed_by).
- Uploads go through a signed upload route that re-checks file signature and size, writes to a private bucket, and serves approved items through short-lived signed URLs. Minors' media never gets a public listing; display requires the same consent gate as profiles.
- No comments, messaging or location sharing for minors at any phase.

## Player cards

The public profile already renders the branded card. Downloadable PNG/PDF cards are a server-rendered image route gated by `memberships.status = 'active'` and the athlete's public status.

## Cross-cutting requirements before Phase 3 ships

- Counsel review of privacy policy, terms, consent forms, retention schedule and the COPPA verifiable-parental-consent method (the `coppa.workflow_approved` setting must stay `false` until then).
- Rate limiting on public forms, auth and webhooks (see known gaps in `IMPLEMENTATION_STATUS.md`).
- Email delivery (transactional) for consent receipts, claim verification and billing notices.
