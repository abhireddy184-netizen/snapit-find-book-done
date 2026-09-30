# Audit: old "GetPerfectBoy" links in sign-in emails

## Root cause (most likely)

1. **The sign-in service's main website address (Site URL) is still `https://getperfectboy.com`.** The sign-up form asks for the confirmation link to return to `<current site>/login`. When `getpros.ai` isn't on the allowed-return-address list, the sign-in service quietly uses the main address instead. That sends people to getperfectboy.com.
2. **`getperfectboy.com` (without www) isn't connected to this project.** Only `www.getperfectboy.com`, `getpros.ai` and `www.getpros.ai` are connected. The address without www has no security certificate here, so the browser shows ERR_SSL_PROTOCOL_ERROR.
3. **Sign-up emails use the standard built-in design.** No custom sign-in email handler exists in the code, so the project's own email files can't fix the link. The fix is the sign-in settings.

I couldn't read the sign-in settings directly. Step 1 confirms them before anything changes.

## What must change

**Sign-in settings (Lovable Cloud → Users → Authentication settings)**
- Site URL: `https://getpros.ai`
- Allowed return addresses: `https://getpros.ai/**` and `https://www.getpros.ai/**`, plus the preview address. Remove the getperfectboy entries.

**Code files that still point to the old brand/domain**
- `src/lib/email-templates/brand.tsx`: the website address, the logo address and support@getperfectboy.com. Every email template uses these.
- `src/lib/subscribe.server.ts`: website address in the newsletter welcome email.
- `src/lib/provider-interest.server.ts`: website address in the Join as a Pro confirmation.
- `src/routes/unsubscribe.tsx`: page address.
- `src/lib/email-templates/send-email.ts`: sender domain `notify.getperfectboy.com`. Moving to `notify.getpros.ai` needs a new email domain set up and verified first. Until then, keep the old one so emails keep sending.
- `src/routes/privacy.tsx` and `src/routes/legal.tsx`: privacy@ and access@ getperfectboy.com. These need real getpros.ai mailboxes from you.
- `docs/auth-email-template.html`: an old unused design file. Delete or rebrand it.

**Already correct:** sign-up, password reset and Google/Apple sign-in all use the current site address in code. The home page uses getpros.ai.

## Steps once approved
1. Read the current sign-in settings to confirm the Site URL.
2. Update the Site URL and the allowed return addresses.
3. Replace getperfectboy.com with getpros.ai in the code files above. Keep the sender domain until a getpros.ai email domain is verified.
4. Optional: set up branded sign-in emails that say GetPros.
5. Test: sign up with a new email. The confirmation link should open getpros.ai/login.

## Questions for you
- Which getpros.ai addresses should replace support@, privacy@ and access@?
