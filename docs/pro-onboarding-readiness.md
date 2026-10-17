# Simplified Pro onboarding verification — 2026-10-17

## Result

The revoked-save mismatch is corrected in preview. Not yet fully verified for publishing. No deployment or real email send was performed. No existing provider's status or documents were changed.

## Implemented

- Applied migrations 0022 and 0023: service-only save without modifying JWT subject; atomic email claims with ten-minute leases, per-attempt fencing tokens and latest-state submission/reminder/approval guards.
- Authenticated saving validates Pro membership using the caller's own client, rejects extra input fields, and binds the privileged RPC UUID exclusively to verified middleware identity.
- All onboarding delivery paths use the shared claim helper and stable email-service idempotency keys. Accepted-message deduplication still depends on the managed email service honoring those keys; this is not a guarantee of inbox delivery.
- Development preview blocks transactional sends; onboarding processors return before claiming jobs. Production sending flags were not changed.
- Welcome/reminder and review/approval flows reuse the existing ledger and hourly scheduler. Unified setup does not use the legacy document-email sequence.
- Signup adds resend recovery; setup preserves local edits during background reloads; document Open/Remove controls no longer submit the enclosing setup form.
- Approval subject is “Your Profile Is Approved” with “We'll notify you when services become available in your area.” No area-availability notification system was added or verified.
- Stripe onboarding now requires manual profile approval before contacting Stripe.

## Passed checks

- Automatic compilation/typecheck: latest observed entry `build OK` at 17:01:13 UTC; no manual build/typecheck was run because the project harness performs them.
- Focused tests: 34 passed, 5 explicitly skipped, across 7 test files.
- Changed onboarding core files: ESLint passed.
- Mocked security tests: trusted owner binding, forged UUID rejection, customer denial, failed-save handling.
- Mocked lifecycle tests: confirmed welcome once, no unconfirmed welcome, staged 24/48-hour reminders once, no submitted reminders, verified-only approval once.
- Mocked delivery tests: concurrent submission processing, retry key reuse, ten-minute crash recovery, stale-worker fencing.
- Read-only applied database privilege test: no anonymous/authenticated privileged save or email-claim access; submission remains authenticated. Read-only function inspection confirmed no JWT-subject mutation in the save wrapper.
- Hosted email settings: email enabled, auto-confirm false. notify.getpros.ai verified; configured contact/Reply-To remains info@getpros.ai.
- Hourly scheduler exists and is active (`0 * * * *`); its source invokes existing onboarding/retry processors. Actual scheduled delivery was not invoked.
- Browser: Pro signup displayed exactly three contact inputs at 320, 390, 768 and 1280 pixels, no horizontal overflow or page errors. Provider registration showed the same signup. Signed-out setup redirected to login with its setup destination preserved. Mobile screenshot visually inspected.

## Unverified / blockers

- Five rollback-only database scenarios are skipped: synthetic signup/draft, private upload+explicit submission, admin approval, and actual claim recovery. The sandbox database identity lacks auth-schema and service-only RPC access. Access was not widened for testing; attempted synthetic transactions rolled back.
- Full authenticated signup → verified email → saved draft readback → actual private upload → manual submission → admin approval was not exercised through the UI. No real user account was substituted.
- The authenticated one-page setup's mobile/tablet/desktop rendering remains unverified; only public signup and signed-out protection were browser-tested.
- Actual SMTP acceptance, inbox delivery, concurrent production workers, and live scheduler behavior are deliberately untested because real messages are prohibited.
- Stripe approval guard is implemented but no Stripe onboarding or payout action was performed.

Keep deployment blocked until an isolated authenticated test environment can exercise the remaining flows without real messages. Do not relax permissions or publish to obtain that verification.