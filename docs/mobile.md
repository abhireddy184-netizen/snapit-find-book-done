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
- Apple guideline 4.2 (minimum functionality) can still reject an app that is only a website in a WebView. Camera, microphone, photo upload, and Sign in with Apple are wired for the WebView (see below). Push notifications are still a follow-up before App Store review.
- `allowNavigation` keeps the live site and the auth hosts inside the WebView. Every other link opens in the system browser. That list is not an OAuth fix. See below.

## Auth hosts the WebView may navigate to

Google and Apple sign-in go through `@lovable.dev/cloud-auth-js`. Outside an iframe (which is the native case) the library navigates to `/~oauth/initiate` on the current origin. Lovable completes the provider dance and returns through `https://getpros.ai/~oauth/callback`, then the app's `/auth/callback`.

`allowNavigation` includes:

- `getpros.ai`, `www.getpros.ai`, `*.getpros.ai`
- Supabase: `osvtvbzhihemzwlubcut.supabase.co`
- Google: `accounts.google.com`, `*.google.com`, `*.googleusercontent.com`
- Apple: `appleid.apple.com`, `*.apple.com`, `*.cdn-apple.com`
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

## Camera, voice, photos, and booking

The live site is what the WebView runs. This branch does not change that site.

- **Photo and gallery.** `/snap` uses hidden `<input type="file">` elements. Photo and video use `capture="environment"` (the system camera). Upload and “Choose from photo library” omit `capture`, so iOS shows the photo picker. Job photos on a booking use the same kind of file input. `NSCameraUsageDescription` and `NSPhotoLibraryUsageDescription` are set. The app never saves into the photo library, so there is no add-photo usage string.
- **Guided video scan.** `GuidedVideoScan` calls `getUserMedia({ video })` and `MediaRecorder`. Capacitor 8’s WKWebView delegate already answers `requestMediaCapturePermission` with `.grant`, which lets iOS show the system camera prompt. No extra native plugin is required.
- **Voice.** The composer prefers `getUserMedia({ audio })` plus `MediaRecorder`, then sends the clip to the site’s transcription endpoint. That is the path iPhone Safari already uses, and it is the path the app uses. `NSMicrophoneUsageDescription` is set.
- **Web Speech API.** `webkitSpeechRecognition` exists only as a fallback when recording is unavailable. It does not work reliably in WKWebView. The shell removes `SpeechRecognition` and `webkitSpeechRecognition` before the page runs, so that fallback cannot start. Voice still uses the recorder. A speech-recognition usage string is not included, because the app does not use that API.
- **Booking.** Booking is ordinary pages and Supabase calls on `https://getpros.ai`. It stays in the WebView with the rest of the site.

## Sign in

Email and password stay on `getpros.ai` and work in the WebView.

**Sign in with Apple.** The site starts Lovable’s broker at `https://getpros.ai/~oauth/initiate` (same window, not a popup) and Apple returns through `https://getpros.ai/~oauth/callback`. That host is the WebView’s `server.url`, and `appleid.apple.com`, `*.apple.com`, and `*.cdn-apple.com` are in `allowNavigation`, so the redirects stay in the app instead of Safari. If Apple opens a new window, the shell loads that URL in the same WebView when the host is Apple, Lovable’s auth origin, Supabase, or getpros.ai. The iOS target has the Sign in with Apple entitlement (`ios/App/App/App.entitlements`). The Apple Services ID for the website is `ai.getpros.signin`; the broker is already configured for `https://getpros.ai`. The entitlement does not replace that web configuration.

**Google.** Google rejects OAuth inside WKWebView (`disallowed_useragent`). The shell hides the button whose label is “Continue with Google” so the tap does not show that error. The published website still shows the button. This is a WebView-only script in `SceneDelegate.swift`. A later, better fix is system-browser or native Google sign-in plus a deep link back. Do not spoof the user agent.

## TestFlight (GitHub Actions, no Mac)

Workflow: `.github/workflows/ios-testflight.yml`.

It runs on a push to `cursor/capacitor-remote-shell-f9cb`, on a tag named `ios-release` or `ios-release-*`, and from the Actions **Run workflow** button. It does not run on pushes to `main`. It uploads to TestFlight only. It does not submit for App Store review.

Two jobs:

1. **iOS simulator (unsigned)** — always builds. This is the check that the Xcode project compiles. Runner is `macos-latest` with Xcode 26.6 (the latest stable image; Xcode 27 is still a preview image).
2. **TestFlight upload** — archives a Release build, signs with automatic signing (`xcodebuild -allowProvisioningUpdates` and the App Store Connect API key), and uploads. Marketing version is `1.0`. The build number is the GitHub Actions run number. If any of the secrets below is missing, this job prints a notice and exits successfully without uploading.

### Secrets the owner adds

In the GitHub repo: **Settings → Secrets and variables → Actions → New repository secret**. Create all three:

| Secret | Value |
|---|---|
| `ASC_KEY_ID` | App Store Connect API key id (10 characters) |
| `ASC_ISSUER_ID` | Issuer id shown at the top of App Store Connect → Users and Access → Integrations → App Store Connect API |
| `ASC_KEY_P8_BASE64` | The `.p8` file, base64-encoded in one line. On a machine that has the downloaded key: `base64 -i AuthKey_XXXXXXXXXX.p8 \| tr -d '\n'` |

The API key needs the **App Manager** or **Admin** role. Apple creates the distribution certificate and provisioning profile on the first signed run because the workflow passes `-allowProvisioningUpdates`. The App ID `ai.getpros.app` must already include Sign in with Apple (it does, on team `96DB94MY2K`).

Do not commit the `.p8` file.

### How to trigger an upload

After the three secrets exist, either:

- push a commit to `cursor/capacitor-remote-shell-f9cb`, or
- push a tag: `git tag ios-release-1 && git push origin ios-release-1`, or
- open the **Actions** tab, choose **iOS**, and click **Run workflow** on this branch.

Then open the run. The simulator job should be green. The TestFlight job should archive and upload. The first upload can take several minutes while Apple issues the certificate.

### Internal testers

1. App Store Connect → **Apps** → GetPros (`ai.getpros.app`). If the app record does not exist yet, create it with that bundle id, name GetPros, and SKU of your choice. The workflow cannot create the app record.
2. Open the build that just finished processing (processing often takes 5–15 minutes after the upload).
3. **TestFlight → Internal Testing**. Add the build to the internal group.
4. Users and Access → the tester’s Apple ID must be a user on the team (Account Holder, Admin, App Manager, Developer, or Marketing). Internal testers do not need a Beta App Review.
5. They install **TestFlight** on an iPhone and accept the invite.

External testers and App Store review are separate and are not part of this workflow.

## Still open before App Store review

- In-app account deletion. The site can create an account and only signs out. Apple guideline 5.1.1(v) requires deletion inside the app. That change has to ship on getpros.ai.
- Push notifications, if you want a stronger answer to guideline 4.2.
- Google sign-in that returns to the app (system browser or the native SDK, plus a deep link). The button is hidden until then.
- Play upload keystore for Android. The iOS TestFlight path above does not publish the Android app.

