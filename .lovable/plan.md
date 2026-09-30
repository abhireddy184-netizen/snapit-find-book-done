# GetPerfectBoy audit (read-only findings) and removal plan

## Findings — every remaining reference

**Code**
- `src/lib/email-templates/brand.tsx`
  - `SITE_URL = 'https://getperfectboy.com'` is used for the header/footer links in every email: welcome, Join as a Pro and internal lead alerts.
  - `LOGO_URL = 'https://getperfectboy.com/icon-512.png'`
  - `SUPPORT_EMAIL = 'support@getperfectboy.com'` appears in the email footer.
- `src/lib/email-templates/send-email.ts`: `SENDER_DOMAIN` and `FROM_DOMAIN` are both `notify.getperfectboy.com`. So the From address is `GetPros <noreply@notify.getperfectboy.com>`.
- `src/lib/subscribe.server.ts:19`: `SITE_URL = "https://getperfectboy.com"` supplies the welcome email link.
- `src/lib/provider-interest.server.ts:7`: `SITE_URL = "https://getperfectboy.com"` supplies the Join as a Pro confirmation link.
- `src/routes/unsubscribe.tsx:7`: `SITE_URL = "https://getperfectboy.com"` sets the canonical link for /unsubscribe.
- `src/routes/privacy.tsx:31`: `privacy@getperfectboy.com`
- `src/routes/legal.tsx:57`: `privacy@getperfectboy.com`
- `src/routes/legal.tsx:94`: `access@getperfectboy.com`
- `docs/auth-email-template.html`: an unused old design file. It has the GetPerfectBoy name, logo, links and support@getperfectboy.com.
- No old-brand mentions in `public/` (icons, manifest). Canonical links on the home page and /trust-safety already use getpros.ai.

**Sign-in emails and redirects**
- The project has no custom sign-in email design. Sign-up confirmation and password-reset emails use the built-in defaults.
- In code, the links return to the current site: `/login` after sign-up, `/reset-password` for resets, `/auth/callback` for Google/Apple.
- A confirmation link opening getperfectboy.com almost certainly means the sign-in service's Site URL, or its allowed return addresses, still points at getperfectboy.com. The service falls back to the Site URL when getpros.ai isn't allowed. This setting isn't visible in the code and must be confirmed in the sign-in settings.
- The certificate error happens because `getperfectboy.com` (without www) isn't connected to this project.

**Connected domains**
- `getpros.ai`: active, primary.
- `www.getpros.ai`: active, redirects to getpros.ai.
- `www.getperfectboy.com`: active, redirects to getpros.ai.

**Email sender domain**
- Configured and verified: `notify.getperfectboy.com`.
- `notify.getpros.ai`: not set up. No GetPros sender domain exists yet.
- `support@getpros.ai`, or any `@getpros.ai` address: not present anywhere in the project.

## Removal steps (after approval)
1. Set up `notify.getpros.ai` as the email sender domain. You'll need to add the DNS records it shows at your getpros.ai domain provider.
2. After it's verified, switch the sender to `notify.getpros.ai` and set up branded GetPros sign-in emails.
3. Change the sign-in Site URL to `https://getpros.ai` and allow `https://getpros.ai/**` and `https://www.getpros.ai/**`.
4. Replace every getperfectboy.com website link and logo link in the files above with `https://getpros.ai`.
5. Replace the support@, privacy@ and access@ addresses with the getpros.ai addresses you choose. Delete the unused old design file.
6. Optional: disconnect `www.getperfectboy.com` and remove the old sender domain once nothing uses it.
7. Test: sign up with a new email and confirm that the email and its link both use getpros.ai.

## Needs your input
- Which getpros.ai mailboxes should be used for support, privacy and accessibility? Do they already receive mail?
