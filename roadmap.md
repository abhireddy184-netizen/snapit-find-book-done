# Roadmap

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
