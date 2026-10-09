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
