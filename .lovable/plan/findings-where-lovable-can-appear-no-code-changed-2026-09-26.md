## Findings: where Lovable can appear (no code changed)

### From project code and files: nothing visible
- Icons (favicon, iPhone icon, app icons 192/512), app settings file, social preview image, page titles and share text all show GetPros only.
- The word "Lovable" appears only in hidden behind-the-scenes code: error reporting, AI requests, email sending, and the Google/Apple sign-in helper. None of it shows on screen.
- The "Edit with Lovable" badge is already turned off for the live site.

### From Lovable's platform, outside project code
1. **Preview link (id-preview--...lovable.app)**: the address bar shows "lovable.app", and the Lovable editor wraps around it. Never record the preview.
2. **Google / Apple sign-in screens**: these use Lovable's shared sign-in accounts, so Google says "continue to Lovable" (or a similar Lovable name) and Apple may show Lovable. This is the only place Lovable can show on the live site.
3. **Old saved icons on your devices**: the Lovable heart in iPhone Safari suggestions is an old copy saved on the phone. The site no longer sends it.
4. **Google Search icon**: Google may show an old icon until it checks the site again.
5. **The web address "snapit-find-book-done.lovable.app"**: it still works. Use getpros.ai instead.

## Recording videos/reels with no Lovable branding (no code needed)
- Record only the live site at **https://getpros.ai**, never the preview or the editor.
- Use a clean browser profile or a private window, or clear Safari history first, so old icons and suggestions don't appear.
- On iPhone, remove the old home-screen icon and add it again before recording. Hide the address bar, or start recording after the page has loaded.
- **Don't record the Google or Apple sign-in steps.** Show email sign-up instead, or cut past the sign-in screen when editing.
- Turn off notifications and hide bookmarks or the tab strip that could show other sites.

## Optional later fix (only if you approve)
To make the Google and Apple sign-in screens show "GetPros", set up your own Google Cloud sign-in account and Apple developer account. Then add them under Cloud, Users, Authentication Settings, Sign In Methods. That's a setup change in those services, not a code change.
