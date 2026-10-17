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
- Provider approval email is sent once per pro (ledger kind approved) queued by the database function admin_set_provider_verification (outbox row kind approved, status pending) on a real change to verified and drained by processApprovedEmails (fast path + hourly); and only when PROVIDER_APPROVED_EMAIL_ENABLED is exactly "true"; why: no spoofed or premature approvals.
- Provider onboarding documents live only in the private provider-documents bucket under <userId>/, with metadata in provider_documents (owner + admin access via policies, admin review via admin_review_provider_document, signed URLs only); why: never expose documents publicly or let uploads approve a pro.
- Admins preview unapproved pros through admin_get_provider_preview at /admin/providers/$id, never by loosening public provider_profiles access; why: unverified pros stay hidden and unbookable.
- Provider document emails (automatic checklist ~15+ min after first complete profile, one receipt when business registration + insurance are uploaded, 24h/48h document reminders while outstanding) live in provider-onboarding.server.ts with ledger kinds documents_*; only for pros created after DOCS_AUTOMATION_CUTOFF with no manual admin request, gated by PROVIDER_DOCUMENTS_EMAIL_ENABLED === "true", drained hourly by run-due; why: no duplicates or retroactive sends to existing pros.
- The provider tutorial video link is one constant (PROVIDER_TUTORIAL_VIDEO_URL in brand.ts) rendered by EmailVideoSlot, hidden while empty; why: never ship a placeholder video.
- App icon binaries derive only from the canonical public/getpros-gpa.svg; keep root head icon versions and public/site.webmanifest aligned, with maskable lettering inside the central 80% diameter safe circle; why: preserve owner-provided artwork without changing the website wordmark or introducing caching workers.
