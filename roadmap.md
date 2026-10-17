# Roadmap

- [ ] Reconcile service-only setup saving without JWT mutation and fence concurrent email claims
- [ ] Verify simplified signup, drafts, uploads, submission, reminders and approval with isolated tests and device checks
- [ ] Report exact readiness and remaining blockers without sending real mail or publishing

- [ ] Simplify Pro signup and add secure unified draft/resume setup
- [ ] Atomically submit complete setup and queue under-verification email; reuse reminders without duplicate sequences
- [ ] Verify onboarding with isolated tests and responsive preview; no real mail or deployment

- [x] Replace app icons with approved GPA branding and verify head/manifest assets (preview only)

- [x] Sign-up: show "account already exists" (with Log in / Reset password) instead of "check your email" for already-registered emails
- [x] Remove old brand/domain everywhere (code, emails, legal pages, booking messages)
- [ ] Verify notify.getpros.ai email sender domain (blocked: DNS setup by owner)
- [ ] Set sign-in Site URL to https://getpros.ai + allowed redirects (blocked: settings not changeable from code)
- [x] Central brand config (src/lib/brand.ts); info@getpros.ai as contact + owner alerts; text wordmark in emails
- [x] Owner alert for new customer/provider accounts
- [ ] Branded GetPros sign-in emails (blocked: notify.getpros.ai must be set up first)
- [x] Owner alert for new booking requests
- [x] Payments part 1: payment tables + money-field protection, Stripe test client, pro "Set up payouts" onboarding, webhook at /api/public/stripe/webhook
- [x] Payments part 2: card step on /book, 2-day hold, approve/auto-capture after 48h, late-cancel fee, admin refund, bookings blocked until pro payouts + price, draft payment terms
- [ ] Payments: end-to-end test with a real test pro (blocked: needs a verified pro with active Stripe payouts and a price)
- [ ] Payments: hourly scheduler calling /api/public/payments/run-due (blocked: no scheduler enabled; dashboards run due work on load meanwhile)
- [x] Connect webhook handles account.updated (re-reads Stripe; shared helper)
- [x] Durable owner alerts (recorded, hourly retry, missed-signup backfill)
- [ ] Stripe Connected-accounts destination in the same test-mode account as the app's key (blocked: owner, Stripe dashboard)
- [ ] Publish + real signed event + Outlook inbox check (blocked: owner approval to publish)
- [x] Search: friendly "coming to your area" message + Notify Me signup when no pro serves the area
