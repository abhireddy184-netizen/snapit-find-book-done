# Launch-readiness audit (read-only, nothing changed)

## VERIFIED FROM CODE
- **Connect webhook route** `/api/public/stripe/connect-webhook` exists and is in the route table. It checks the signature with `STRIPE_CONNECT_WEBHOOK_SECRET` (raw body + `constructEventAsync`), rejects missing/bad signatures with 400, skips repeat events, and returns 500 so Stripe retries on errors.
- **BLOCKER: the connect route has no `account.updated` handling.** It only handles payment and refund events. `account.updated` reaches its `default:` branch, gets logged as processed, and nothing happens. Pro payout readiness (`charges_enabled` / `payouts_enabled`) is updated by `account.updated` only in the *other* route, `/api/public/stripe/webhook`. That route also accepts the Connect secret.
- Bookings are refused unless the pro has a payout account with charges and payouts enabled (database trigger). So if `account.updated` is never saved, no pro can be booked.
- **Social sign-in:** the code supports only Google and Apple. **There is no GitHub sign-in.** Apple uses the same callback page (`/auth/callback`) as Google.
- **Owner emails** all go to info@getpros.ai, sent from noreply@notify.getpros.ai, with Reply-To set to the person who signed up:
  - Join-as-a-Pro interest form: one email per new email + trade. A repeat for the same trade sends no email.
  - **Every new account (customer or pro):** one "new account" alert, sent from the sign-up form and the Google/Apple callback. It is limited to one per account and only goes out within 30 minutes of account creation. The pro also gets a confirmation email.
  - Newsletter and early-access emails also go to the owner.
  - So the owner gets **all pro sign-ups and all interest submissions as separate emails**. A pro who fills in the interest form and then signs up produces 2 owner emails. That is expected, not a duplicate.
  - Bookings and pro profile setup send no owner email.
- **Missed emails:** sending never blocks a sign-up. A failed send is only written to the server log and is not retried. A new-account alert is lost if the browser closes before the call fires.

## VERIFIED LIVE (safe, no data sent)
- `POST https://getpros.ai/api/public/stripe/connect-webhook` with no signature returns 400 "Missing signature". `GET` returns 405. The route is deployed and reachable.
- `https://www.getpros.ai/...` redirects (302/307) to `getpros.ai`. **Stripe does not follow redirects**, so the destination URL must be the apex `getpros.ai`, which is what the owner says they entered.
- Database counts: **0 Stripe events ever recorded** (none of any kind). 1 payout account, **0 ready** (charges and payouts enabled). 5 pro accounts, 1 pro business profile, 5 interest submissions. 1 hourly scheduled job active.
- So no signed Stripe event has ever been processed by either route. **Do not treat "Active" as proof that events are delivered.**

## NOT TESTED
- Real Stripe delivery to either route, and whether the saved secret matches the new destination's signing secret.
- Whether the live site runs the latest code (the ~34 fixes may not be published).
- Apple sign-in end-to-end. Apple provider settings on the backend were not read.
- Real inbox delivery to Outlook (spam/junk, and whether info@getpros.ai receives mail at all).
- Signup email-confirmation setting. It was not read from the backend. The code expects confirmation (redirect to `/login?confirmed=1` and an "already exists" message), so **confirmation is presumed ON but unverified**.
- Full pro onboarding through Stripe as a signed-in pro.

## BLOCKERS
1. `account.updated` sent to the connect destination is silently ignored, so pros never become bookable.
2. Zero events ever received. The destination config is unproven: it may be the wrong event types, the wrong mode, or the snapshot type may not include connected-account events the way it should.
3. GitHub login does not exist, if it is a launch requirement.
4. 0 of 1 payout accounts are ready, so currently no pro can be booked.

## Minimal actions (for a later build turn)
1. Add the same `account.updated` update (matched by `stripe_account_id`) to the connect route, or point the Connect destination at `/api/public/stripe/webhook`, which already handles it and accepts the Connect secret. Only one destination should handle it.
2. In Stripe (test mode): make sure the destination listens to "Connected accounts" events and includes `account.updated` plus the payment_intent/charge events. Use "Send test event", or complete a test pro's onboarding. Then check that a row appears in `stripe_events` and that the response in Stripe's delivery log is 200 (not 400 Invalid signature).
3. If Stripe shows 400 Invalid signature, re-copy the signing secret into `STRIPE_CONNECT_WEBHOOK_SECRET`.
4. Publish, so that live matches preview.
5. Confirm the email-confirmation and Apple settings on the backend. Send one real interest form and one sign-up, and check that the Outlook inbox gets exactly 1 email each (check Junk too).
6. Decide on GitHub sign-in: add it or drop it from the launch list.
