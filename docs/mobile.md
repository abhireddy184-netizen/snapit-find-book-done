# GetPros native apps (Capacitor)

The iOS and Android projects in this repo are a native shell around the live website. They do not bundle the TanStack / Vite build. Publishing in Lovable updates what the app shows, without a new App Store or Play release, as long as the native shell itself does not change.

App id (iOS bundle id and Android application id): `ai.getpros.app`  
Display name: `GetPros`  
Apple Team ID (existing App ID): `96DB94MY2K`  
Live content: `https://getpros.ai`  
Capacitor: 8.5.2 (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/ios`)

## Remote loading

`capacitor.config.ts` sets `server.url` to `https://getpros.ai`. On launch the WebView opens that URL. `webDir` is `mobile/www`, a small offline page. `cap sync` copies that page into the native projects. If the site cannot be loaded, Capacitor shows it (`server.errorPath`). It is not the SSR output (`dist`, `.output`, or `.nitro`), so `bun run build` and Lovable preview/publish are unchanged.

`server.cleartext` is `false` and Android mixed content is off. The live site and the auth hosts are HTTPS only.

### Tradeoffs

- The app needs a network. There is no offline copy of the product, only the fallback page.
- A Lovable publish can ship a broken build straight into installed apps. There is no store review of web changes.
- Apple guideline 4.2 (minimum functionality) rejects apps that are only a website in a WebView. Remote loading is allowed for development and for apps that also do something native. Before submission, add native features the site cannot do as well on its own: push notifications, the camera for Snap, Sign in with Apple, and a proper return path from system-browser login. A thin wrapper is a real rejection risk.
- `allowNavigation` keeps the live site and the auth hosts inside the WebView. Every other link opens in the system browser. That list is not an OAuth fix. See below.

## Auth hosts the WebView may navigate to

Google and Apple sign-in go through `@lovable.dev/cloud-auth-js`. Outside an iframe (which is the native case) the library navigates to `/~oauth/initiate` on the current origin. Lovable completes the provider dance and returns through `https://getpros.ai/~oauth/callback`, then the app's `/auth/callback`.

`allowNavigation` includes:

- `getpros.ai`, `www.getpros.ai`, `*.getpros.ai`
- Supabase: `osvtvbzhihemzwlubcut.supabase.co`
- Google: `accounts.google.com`, `*.google.com`, `*.googleusercontent.com`
- Apple: `appleid.apple.com`, `*.apple.com`
- Lovable origins from `cloud-auth-js`: `oauth.lovable.app`, `lovable.dev`, `*.lovable.dev`

Email and password talk to Supabase from the page and do not need a navigation.

## Scripts

```bash
bun run cap:sync          # copy mobile/www and the config into ios/ and android/
bun run cap:open:ios      # open the Xcode project (Mac only)
bun run cap:open:android  # open the Android Studio project
```

Run `cap:sync` after changing `capacitor.config.ts` or `mobile/www`. You do not run it after a normal Lovable publish. The copies under `ios/App/App/public`, `android/app/src/main/assets/public`, and the generated `capacitor.config.json` files are gitignored; `cap sync` recreates them, and a native build needs that step first.

## Android App Bundle

Needs Android Studio (or the Android SDK plus a JDK) on any OS. This repo's Gradle project targets SDK 36.

1. `bun install`
2. `bun run cap:sync`
3. `bun run cap:open:android`
4. In Android Studio: **Build > Generate Signed App Bundle / APK**, choose **Android App Bundle**, and sign with the upload key you will register in Play Console.
5. Or from the CLI, after `android/keystore.properties` (or environment variables) points at that keystore: `cd android && ./gradlew bundleRelease`. The AAB is under `android/app/build/outputs/bundle/release/`.

Do not commit the keystore or `local.properties`. Play Console application id is `ai.getpros.app`.

A debug APK (not for the store) is `cd android && ./gradlew assembleDebug`.

## iOS archive

Compiling, signing, and uploading need a Mac with Xcode, or a macOS CI image (Codemagic can do this). Capacitor 8 adds the iOS project with Swift Package Manager, so CocoaPods is not required. `cap add ios` can be run on Linux and produces the Xcode project; it cannot archive it.

On a Mac:

1. `bun install && bun run cap:sync`
2. `bun run cap:open:ios`
3. The GetPros target already uses automatic signing with team `96DB94MY2K` and bundle id `ai.getpros.app` (the App ID already exists on that team). Confirm the team in Xcode if the machine is signed into a different account.
4. **Product > Archive**, then distribute to App Store Connect.

On Codemagic (or similar): a macOS instance, Xcode, an App Store Connect API key, and a distribution certificate / provisioning profile for `ai.getpros.app`. The workflow should run `bun install` and `bun run cap:sync`, then `xcodebuild archive` on `ios/App/App.xcodeproj` (SPM, not a CocoaPods workspace).

## Next steps before store submission

In order:

1. **Google and Apple sign-in outside the WebView.** Google rejects OAuth inside embedded WebViews (`disallowed_useragent`). Sign in with Apple inside WKWebView is also unreliable. Do not spoof the user agent to hide the WebView. Use the system browser (ASWebAuthenticationSession on iOS, Chrome Custom Tabs on Android) or the native Google Sign-In and Sign in with Apple SDKs, then hand the session back with a deep link. Universal Links (`https://getpros.ai/...`) and an Android App Link on the same host are the durable option; a custom scheme is the fallback. The Lovable broker already knows about app schemes: `cloud-auth-js` looks for a `LovableAppScheme/<scheme>` user-agent token and can redirect to `<scheme>://oauth-callback`. Email/password can stay in the WebView.
2. **In-app account deletion.** The app lets people create an account and only signs them out (`supabase.auth.signOut`). Apple guideline 5.1.1(v) requires account deletion inside the app, not only on the website. Add a delete-account action that removes the Supabase user, then call it from the same screens on the web so the native shell picks it up.
3. **Icons and splash.** Replace the default Capacitor launcher assets. Source images already live in `public/` (`icon-512.png`, `apple-touch-icon.png`). `@capacitor/assets` can generate the iOS App Icon set and Android adaptive icons plus a splash on the brand surface `#f1f8f9`.
4. **Native features, to answer guideline 4.2.** Push notifications, and the camera/microphone for Snap (the site already uses `getUserMedia` in the browser; a native capture plugin is more reliable in a WebView and is a real native capability). Those plugins require another `cap sync` and a store release.
5. **Store metadata.** Privacy policy URL `https://getpros.ai/privacy`, support URL, screenshots, and the App Store privacy nutrition labels / Play Data safety form (account data, photos, location if you collect them). Confirm the signed-in delete path is visible to review.
6. **Signing.** Create the Play upload keystore and the iOS distribution cert for team `96DB94MY2K`. Archive on a Mac or Codemagic. Submit the AAB and the iOS archive. Do not point `server.url` at a preview host.
