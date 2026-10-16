<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Pro payout readiness is only written by src/lib/payout-sync.server.ts, which re-reads the account from Stripe; why: never trust event payloads, one source of truth for both webhooks.
- Owner alerts go through src/lib/owner-notify.server.ts (owner_notifications table, stable keys, hourly retry/backfill in run-due); why: no lost or duplicate alerts.
- Provider onboarding emails (welcome + reminders at 24h and 48h after signup) go through src/lib/provider-onboarding.server.ts, recorded in provider_onboarding_emails before sending and run hourly by run-due; why: one send per pro, never retroactive, retry without duplicates.
- Public support chat answers come from src/lib/support-chat.functions.ts (grounding prompt + rate limit in support-chat.server.ts, FAQ fallback labelled as such); why: one guarded place for public AI answers, never account data.
- Provider "profile submitted" confirmation is sent once per pro from provider-onboarding.server.ts (ledger kind profile_submitted) and only when server env PROVIDER_SUBMITTED_EMAIL_ENABLED is exactly "true"; why: owner must approve before live providers get it.
- Provider approval email is sent once per pro (ledger kind approved) only via the admin server function in provider-verification.functions.ts on a real change to verified, and only when PROVIDER_APPROVED_EMAIL_ENABLED is exactly "true"; why: no spoofed or premature approvals.
