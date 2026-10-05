# Google / Apple sign-in branding

The Google and Apple consent screens are served by the shared Lovable Cloud sign-in accounts, so they show the platform's name rather than GetPros. Page code cannot change this.

To show "GetPros.ai" instead, the owner (Abhinav) needs to:

1. In Google Cloud Console, create an OAuth client (Web application) for an app named **GetPros.ai**, upload the GetPros logo, and set the authorized domains (getpros.ai).
2. Add the redirect URL shown in Lovable Cloud → Users → Authentication Settings → Sign In Methods → Google.
3. Paste the client ID and secret into that same Google setting. Do the same for Apple if needed.
