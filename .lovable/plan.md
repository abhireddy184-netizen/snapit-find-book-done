# Pre-publish read-only audit — commit 24b85fc5

Read-only. No files edited, nothing deployed, no data written. Evidence = current source + live database introspection (pg_trigger / pg_constraint / pg_indexes / pg_policies via read-only SQL).

## What was actually executed vs. source-read

Actually run: `bunx tsgo --noEmit` (exit 0, clean); `bunx vitest run` (4 files, 24 tests, all pass: stable-transcript, plan-conversation, snap-intent, plan-timing); read-only SQL introspection of triggers, constraints, indexes. Not run: production build, Playwright, any end-to-end booking (would create data). No claim of end-to-end pass is made below.

## Launch blockers

1. **FAIL — Bookings are never assigned to a provider.** `src/routes/book.tsx:183` inserts `provider_id: null`, and `src/lib/jobs.ts:234` does the same. A repo-wide grep shows no code path anywhere that sets `bookings.provider_id` to a real user. Consequences, all confirmed by code:
   - Provider dashboard reads `bookings` by `provider_id` (`src/lib/bookings.ts:21`) → a pro will never see a customer booking.
   - DB exclusion constraint `bookings_no_provider_overlap` is `WHERE provider_id IS NOT NULL` → atomic overlap protection exists but can never fire in the live flow.
   - Provider weekly hours / time off / pause are **not consumed at booking time**: `book.tsx` calls `slotsForDate({ totalMinutes, timeZone, notBefore })` only — no `hours`, `timeOff`, or `busy` are passed, and `fetchBusy`/`fetchAvailability` (`src/lib/schedule.ts`) are never called from `/book`. Slots shown are platform-window-only.
2. **FAIL — Buffer is not persisted / duration is not authoritative.** UI reserves `TOTAL_MINUTES = 60 + 15` for slot spacing, but the insert omits `duration_minutes` (DB default 60) and sends a client-computed `end_at`. The trigger then overwrites `NEW.end_at := start_at + duration_minutes` (60), so the 15-minute travel buffer never reaches the database and never protects a pro's next job.
3. **FAIL — `/book` photos are decorative only.** `book.tsx:285-289` pushes CSS gradient class names into `photos`; nothing is uploaded to storage and nothing is persisted. Review step reports "N attached" for images that do not exist.
4. **FAIL — Quote requests from the AI result screen are fake.** `snap.tsx sendQuoteRequests()` sets a flag on a 2.4s timer; no `provider_quotes` row and no notification. Same for the message/call buttons.
5. **FAIL (privacy) — `provider_profiles` is `SELECT … USING (true)` to `anon`** and the table carries `phone`. Any anonymous visitor can read provider phone numbers via the Data API.

## PASS with evidence

- **DB enforcement is deployed and authoritative** (this answers the "prove it" ask). Trigger `bookings_enforce_rules` on `public.bookings` exists live and: rejects a missing/invalid `service_timezone`; recomputes `end_at`; enforces local `08:00`–`20:00` in `service_timezone` including "must not cross the date"; enforces the status graph pending→confirmed/cancelled, confirmed→in_progress/cancelled, in_progress→completed/cancelled; enforces that only `provider_id` may confirm/start/complete and only customer or provider may cancel; stamps `started_at`/`completed_at`/`cancelled_at`; sets `overran_window` when completion is past 20:00 local. Plus `bookings_duration_ck` (15–480, NOT VALID) and the GiST exclusion constraint above.
- **DST / non-DST correctness (source audit).** `zonedTimeToUtc` (`service-hours.ts`) iterates to the true instant rather than applying a fixed offset; zones come from ZIP → `ZIP3_ZONE`/`STATE_ZONE`, including `America/Phoenix` and `Pacific/Honolulu`. Not exercised by an automated test at this commit.
- **Idempotency / retry on transitions.** `transitionBooking` guards with `.eq("status", from)` and reports "already updated somewhere else" when zero rows match (`src/lib/schedule.ts`).
- **ZIP resolver coverage.** `us-zips.data.ts` holds ~42,555 records across 62 state/territory codes, lazily loaded; `/book` refuses to schedule without a resolvable US ZIP (`submit()` guard).
- **Customer status is persisted, not local.** Dashboard renders `booking.status` from the DB.
- **Provider ZIP + verification.** ZIP validated against the real dataset before save (`provider-dashboard.tsx:327-332`); `verification_status` is locked server-side by trigger `provider_profiles_lock_verification` — self-verification is impossible.
- **Typecheck clean; all 24 existing unit tests pass** (TV/service intent, multilingual banter-vs-plan, plan timing).

## Needs attention (non-blocking)

- **Booking draft restoration** (`book.tsx` restore effect) runs on every `/book` mount, not only post-login, and jumps straight to the review step; it restores service/details/address/date/slot but **drops the saved `providerId`** and does not re-validate the restored slot against the current lead time before showing Review.
- **RLS allows a customer to set any `provider_id`** on insert (policy checks only `customer_id = auth.uid()`). Harmless today only because the UI sends null.
- **Mock provider data is still the only provider directory** — `snapit-data.providers` backs `/search`, `/snap` matches, `/book`, `/emergency`, `/tracking`, `/provider/$id`. `/search` labels them "Example profiles … not available to book"; `/snap` and `/book` do **not** carry that disclaimer while offering "Book".
- **Legal is an interim summary**, self-described as "full legal documents are being prepared with counsel". Acceptable only as a deliberate launch choice.
- **US-only copy remnants**: `catalog.ts:9` "globally extensible", `phone.ts:33` invites "+country code for international". Cosmetic vs. the US-only positioning.
- **Notifications**: only Resend paths that exist are provider-interest and subscriber/welcome email (`src/lib/email-templates/*`). No booking-requested / accepted / declined / reminder email or push anywhere.

## Route inventory (24 route files, read from `src/routes`)

Public: `/` (index), `/snap`, `/plan`, `/search`, `/services`, `/services/$category`, `/services/$category/$service`, `/categories`, `/provider/$id`, `/emergency`, `/tracking/$id`, `/history`, `/book`, `/login`, `/register`, `/reset-password`, `/provider-interest`, `/unsubscribe`, `/legal`. Authenticated (`_authenticated/route.tsx` gate, `ssr:false`): `/dashboard`, `/provider-dashboard`, `/job/$id`. Plus `__root`, `lovable/*`.

## Verdict

**BLOCKED for publish** on items 1–5. The scheduling *rules* are real and enforced in the database; the *marketplace wiring* that would make them apply (assigning a provider, honouring that provider's settings, persisting the buffer, real photos, real quote requests) is not in place at this commit, and provider phone numbers are anonymously readable.
