## Diagnosis (favicon / app icons)

- All six files (favicon.ico, favicon-32, favicon-96, apple-touch-icon, icon-192, icon-512) contain the GetPros GP monogram. None contain the Lovable heart.
- The live site getpros.ai serves those exact same files, and every icon link in its page head points to them (?v=gp5). The manifest also points only to GetPros icons.
- Safari also checks a few fixed addresses on its own. `/apple-touch-icon-precomposed.png` and `/favicon.svg` return "not found" (404). When that happens, Safari/iOS can fall back to an older copy it saved earlier, from before the icons were replaced.
- www.getpros.ai redirects to getpros.ai. The suggestion may come from an old saved copy of the www version.
- Likely cause: the heart comes from iPhone's own saved icon history (Safari suggestions and iCloud-synced history). The site no longer sends it.

## Proposed changes (only if approved)

1. Add `public/apple-touch-icon-precomposed.png`, a 180x180 copy of the current apple-touch-icon, so Safari never gets "not found" for it.
2. Add a `favicon.svg` or leave that address unused. The simplest option is to do nothing here, since no page links to it.
3. Change the version tag from gp5 to gp6 in the root head and the manifest, then publish.
4. On the iPhone: go to Settings > Safari > Clear History and Website Data. This also clears history synced through iCloud. Then visit getpros.ai again.

The favicon-32 image is noticeably soft. A larger source logo would make it sharper. This is cosmetic and doesn't cause the heart.
