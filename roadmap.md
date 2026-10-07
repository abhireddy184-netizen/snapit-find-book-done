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
- [ ] Payments part 2: Payment step on /book (save card), hold on pro confirm (2-day rule), approve/auto-capture after 48h, cancellation fees/refunds, admin refund, block bookings until payouts active, fixed prices on services, terms/legal copy (blocked: webhook signing secrets from owner)
