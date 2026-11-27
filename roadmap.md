# Roadmap

- [x] Make initial Pro review document-free in client/backend, preserve drafts/phone/statuses and update EN/ES required lists. Verified disposable signed-in Pro: backend rejects missing phone, registered-business draft with trade flag resumes and submits with zero uploads, remains under verification on reload, repeated submit succeeds without duplication; 375/768/1280px no overflow. Focused tests: 36 passed, 6 rollback-only tests skipped due restricted database role; build OK. Backend change applied to shared database; page/email changes not published; test email ledger remained pending with zero attempts.

- [x] Reproduce live photo-only failure; repair media deadlines and homepage handoff; verify real plumbing/cleaning uploads and text fallback in preview.
- [x] Publish scanner repair and repeat live photo-only verification: public /snap identified under-sink plumbing from a photo with no text and offered pipe repair, leak detection, drain clearing and faucet replacement.

- [x] Reconcile service-only setup saving without JWT mutation and fence concurrent email claims
- [ ] Verify authenticated signup/draft/upload/submission/approval and setup device layouts (blocked: isolated auth/service-only database test access unavailable; no real accounts or emails allowed)
- [x] Report exact readiness and remaining blockers without sending real mail or publishing

- [x] Simplify Pro signup and add secure unified draft/resume setup
- [x] Atomically submit complete setup and queue under-verification email; reuse reminders without duplicate sequences
- [x] Run isolated mocked onboarding tests and public responsive preview checks; detailed remaining verification above

- [x] Replace app icons with approved GPA branding and verify head/manifest assets (preview only)

- [x] Sign-up: show "account already exists" (with Log in / Reset password) instead of "check your email" for already-registered emails
- [x] Remove old brand/domain everywhere (code, emails, legal pages, booking messages)
- [x] Verify notify.getpros.ai email sender domain
- [ ] Set sign-in Site URL to https://getpros.ai + allowed redirects (blocked: settings not changeable from code)
- [x] Central brand config (src/lib/brand.ts); info@getpros.ai as contact + owner alerts; text wordmark in emails
- [x] Owner alert for new customer/provider accounts
- [ ] Branded GetPros sign-in emails (blocked: notify.getpros.ai must be set up first)
- [x] Owner alert for new booking requests
- [x] Payments part 1: payment tables + money-field protection, Stripe test client, pro "Set up payouts" onboarding, webhook at /api/public/stripe/webhook
- [x] Payments part 2: card step on /book, 2-day hold, approve/auto-capture after 48h, late-cancel fee, admin refund, bookings blocked until pro payouts + price, draft payment terms
- [ ] Payments: end-to-end test with a real test pro (blocked: needs a verified pro with active Stripe payouts and a price)
- [x] Payments: hourly scheduler calling /api/public/payments/run-due exists and is active (execution not invoked during onboarding tests)
- [x] Connect webhook handles account.updated (re-reads Stripe; shared helper)
- [x] Durable owner alerts (recorded, hourly retry, missed-signup backfill)
- [ ] Stripe Connected-accounts destination in the same test-mode account as the app's key (blocked: owner, Stripe dashboard)
- [ ] Publish + real signed event + Outlook inbox check (blocked: owner approval to publish)
- [x] Search: friendly "coming to your area" message + Notify Me signup when no pro serves the area

- [x] ProConnect admin-only AI Calling Agent dashboard (leads, DFW filters, consent/DNC, EN/ES scripts, history, follow-ups, metrics, simulation mode)
- [ ] ProConnect live calling (blocked: no authorized phone/voice provider chosen; compliance sign-off needed)
- [x] One-time-per-session rising entrance animation using the GPA icon
- [ ] Confirm what "Bata" refers to (blocked: owner answer — no bot/mascot asset in the project)

- [x] Upgrade the floating support chat in place to GPA Pulse (GPA mark + heartbeat launcher, EN/ES toggle, quick-action chips wired to Show GP / categories / Pro signup, human-support menu)

- [x] Site-wide Founding Pros offer banner (BLACK FRIDAY → HOLIDAY OFFER Nov 28, countdown to Dec 31 11:59 PM Chicago, session dismiss, auto-stop)
- [ ] Apply "keep 100% of first 3 jobs" in payments (blocked: owner decision — payments still take 15%)
- [ ] First ad campaign (DFW Pro recruiting, Facebook/Instagram): connect Facebook ad account, then creative (blocked: owner must connect Facebook)

- [x] Banner: use the new Black Friday artwork's team photo as the background (artwork text cropped out; live offer, countdown and button stay)
- [x] Pro signup form: English / Español switch (all form text, errors and screen-reader labels; entered values kept)

- [x] Add "Keep 1000n your first 3 jobs. Keep 85 0x0p+0fter that." to the homepage banner (preview only)
