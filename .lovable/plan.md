# GPB / GetPerfectBoy.com — Launch Readiness Audit (read-only, no code changed)

Scope covered: all 18 routes, navigation, forms, auth, booking, provider flow, AI snap, newsletter/email, live database (RLS, grants, row counts), legal/footer, SEO/robots, mobile shell.

## Verdict

The site is **presentation-ready but not marketplace-ready**. Design, routing, AI snap, and the newsletter/email pipeline are genuinely working. The commercial loop is not: no real provider can be discovered, booked, quoted, or paid, and several screens present fabricated pros as real.

Live database check (queried directly):

| Table | Rows | RLS | Policies |
|---|---|---|---|
| auth users | 0 | — | — |
| profiles | 0 | on | 3 |
| provider_profiles | 0 | on | 3 |
| bookings | 0 | on | 6 |
| service_requests | 0 | on | 3 |
| provider_quotes | 0 | on | 5 |
| job_documents | 0 | on | 2 |
| subscribers | 3 | on | 1 |
| provider_interest | 1 | on | 1 |

Security linter: no issues. RLS policies and grants are correctly scoped on every public table; nothing is world-readable that shouldn't be.

## Critical (must fix before launch)

1. **Bookings never attach to a real provider.** `src/routes/book.tsx:119-130` hardcodes `provider_id: null`; the "pro" comes from the mock array in `src/lib/snapit-data.ts` (string IDs like `marcus-r`, not UUIDs). Consequence: the six correctly-written `bookings` RLS policies for providers are dead code, and `fetchProviderBookings` (`src/lib/bookings.ts:17-25`) plus the provider dashboard inbox (`src/routes/_authenticated/provider-dashboard.tsx:99-186`) can never receive anything. Zero bookings exist in production.
2. **Fake providers shown as real, with no disclosure, on trust-critical pages.** `src/routes/emergency.tsx:4,96` (24/7 emergency dispatch with fake star ratings) and `src/routes/tracking.$id.tsx:5,17,61,74,78` (fake ETA, "verified" badge, rating, simulated live movement) and `src/routes/book.tsx:274-288` (fake pro on the confirmation review step). `provider.$id.tsx:50` and `search.tsx:248-260` do label demo data; these three do not. This is a consumer-protection/trust risk, not just a polish issue.
3. **No legal pages exist.** No `terms`, `privacy`, `cookies`, or `accessibility` routes anywhere in `src/routes/`. Footer links at `src/routes/index.tsx:332` are all `href="#"`. Required before app-store submission and before collecting emails/addresses (which the app already does).
4. **No real provider supply.** `provider_profiles` is empty and only `search.tsx` reads it (`src/lib/providers.ts`). A provider who signs up gets no public profile page, cannot be booked, and has no UI anywhere to submit a quote — `provider_quotes` rows are only ever created by `seedDemoQuotes` (`src/lib/jobs.ts:227-246`) with `provider_id: null`.

## High

5. **Quote comparison is entirely fabricated client-side.** "Request quotes" (`src/routes/_authenticated/job.$id.tsx:396-405`) generates three fake quotes from the mock pool. Accepting a quote drops the real `provider_id` on the way to `/book` (`job.$id.tsx:407-419`).
6. **Silent write failures.** No error handling on: the `service_requests` status update after booking (`book.tsx:138-148`), provider accept/decline (`provider-dashboard.tsx:104-108`), document delete (`job.$id.tsx:655-658`), before-photo upload (`src/lib/jobs.ts:130-136`, falls back to `beforePath = null` with no warning).
7. **Footer "Company"/"Support" columns are plain text, not links.** `src/routes/index.tsx:287-288, 338-343` — About, Careers, Press, Blog, Help center, Contact, Trust & safety, Cancellation all render as unclickable `<li>`. Social icons at `index.tsx:280-284` are `href="#"`. `book.tsx:316` "Contact support" points at `/`.
8. **No transactional email beyond the welcome note.** Only `welcome` is registered in `src/lib/email-templates/registry.ts`. No booking confirmation, quote received, or job completed email despite those flows existing.
9. **No sitemap.xml and no `Sitemap:` line in `public/robots.txt`.** Internal email preview route `src/routes/lovable/email/transactional/preview.ts` and `_authenticated/*` are crawlable.

## Medium

10. **Canonical tags on only 2 of 18 routes** (`index.tsx:34`, `unsubscribe.tsx:23`). Missing on services, category, service-detail, search (`?q=`/`?loc=` query params → duplicate-content risk), emergency, provider profiles.
11. **Bottom nav has a dead entry.** `src/components/snapit/AppShell.tsx:125-130` — both "Bookings" and "Profile" point to `/dashboard`; no profile route exists.
12. **`jobId` from the URL is used in an update with no ownership check** (`book.tsx:138-148`). Not exploitable — RLS blocks it — but it fails as a silent 0-row update with no feedback.
13. **Visible "coming soon" stubs** in signed-in surfaces: address book (`_authenticated/dashboard.tsx:336`), verification badge review (`provider-dashboard.tsx:359`), social sign-in buttons (`src/components/snapit/AuthForm.tsx:173,237`).
14. **Job verification state inconsistency** — uploading a replacement after-photo resets `verification_status` to `not_started` while leaving `status: completed` (`job.$id.tsx:526-530`).

## Low

15. `unsubscribeByToken` (`src/lib/subscribe.server.ts:62-71`) has no rate limiting — UUID space makes enumeration impractical.
16. Several sub-services fall back to an icon tile instead of a photo in `src/lib/scenes.ts` (deliberate de-duplication, reads as missing imagery).
17. Tablet (768px) still renders the stacked phone hero rather than a two-column composition.

## What is already solid

- RLS and grants correct on all 8 tables; security linter clean; `provider_profiles` public SELECT is column-restricted in code (`src/lib/providers.ts:8`), self-verification blocked by a DB trigger.
- Auth gate uses server-validated `supabase.auth.getUser()` (`src/routes/_authenticated/route.tsx:6-11`), CSRF middleware on all server functions (`src/start.ts:26-28`), `supabaseAdmin` confined to server-only modules.
- AI snap flow: 40s timeout, stale-response token, defensive JSON parsing with safe fallback (`src/lib/snap-analyze.server.ts:92-153`, `src/routes/snap.tsx:103-124`).
- Newsletter: verified sender domain, save and delivery correctly decoupled, honest UI state.
- Every route has unique title/description/OG metadata; all internal `Link`/`navigate` targets resolve; mobile safe-area padding handled correctly in `AppShell.tsx:16,132`.

## Suggested launch sequencing (no code changed yet)

- **Block launch on:** items 1–4.
- **Then:** 5–9 before any app-store submission.
- **Alternative if you want to ship sooner:** relaunch as a lead-capture site — remove or gate `/tracking`, `/emergency` dispatch and the demo-pro booking review, keep snap → request → "we'll match you" + provider waitlist. That converts items 1, 2 and 5 from "build the marketplace" into "remove the illusion", and leaves only legal pages (3) as a hard blocker.

Tell me which track you want and I'll produce an implementation plan for it.
