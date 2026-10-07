import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Native shell for GetPros.
 *
 * The WebView loads the live site (server.url). mobile/www is only the
 * offline/error fallback copied in by `cap sync` — it is not the Vite/Nitro
 * build, so Lovable preview and publish are unchanged.
 *
 * See docs/mobile.md.
 */
const config: CapacitorConfig = {
  appId: "ai.getpros.app",
  appName: "GetPros",
  webDir: "mobile/www",
  backgroundColor: "#f1f8f9",
  loggingBehavior: "debug",
  server: {
    url: "https://getpros.ai",
    // Remote content is HTTPS. Do not allow cleartext HTTP in the WebView.
    cleartext: false,
    // Android's local scheme, used for the offline page. The live site is https://getpros.ai.
    // iOS keeps the default `capacitor` scheme: WKWebView cannot register http or https.
    androidScheme: "https",
    // Shown when https://getpros.ai cannot be loaded. Path is inside webDir.
    errorPath: "index.html",
    allowNavigation: [
      // Live site, including the Lovable OAuth broker on the same origin
      // (/~oauth/initiate and /~oauth/callback).
      "getpros.ai",
      "www.getpros.ai",
      "*.getpros.ai",
      // Supabase project (src/integrations/supabase, .env SUPABASE_URL).
      "osvtvbzhihemzwlubcut.supabase.co",
      // Google sign-in. The consent flow hops across Google hosts.
      "accounts.google.com",
      "*.google.com",
      "*.googleusercontent.com",
      // Sign in with Apple (appleid.apple.com plus idmsa / CDN hosts).
      "appleid.apple.com",
      "*.apple.com",
      // @lovable.dev/cloud-auth-js supportedOAuthOrigins.
      "oauth.lovable.app",
      "lovable.dev",
      "*.lovable.dev",
    ],
  },
  android: {
    allowMixedContent: false,
    // Release builds stay non-debuggable. Debug builds still allow WebView
    // debugging automatically.
    webContentsDebuggingEnabled: false,
  },
  ios: {
    // The site does not set viewport-fit=cover, so let iOS inset the WebView
    // under the status bar and home indicator.
    contentInset: "automatic",
    limitsNavigationsToAppBoundDomains: false,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
