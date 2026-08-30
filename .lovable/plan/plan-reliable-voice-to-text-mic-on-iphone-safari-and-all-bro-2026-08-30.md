# Plan: Reliable voice-to-text mic on iPhone Safari (and all browsers)

## Why the mic shows "unsupported" on iPhone

The current mic in `OutcomeComposer.tsx` uses the Web Speech API
(`SpeechRecognition` / `webkitSpeechRecognition`). **iOS Safari does not
implement speech *recognition* in the Web Speech API at all** (only speech
synthesis). So the feature detection correctly reports "unsupported" on every
iPhone, in every browser app on iOS (Chrome/Firefox on iOS are Safari under the
hood). This is expected behavior, not a bug — but it means the Web Speech API
alone can never serve iPhone users.

## What the project already has (confirmed by inspection)

- `src/lib/ai-gateway.server.ts` — Lovable AI gateway provider factory
  (`https://ai.gateway.lovable.dev/v1`), key read inside handlers via
  `process.env['LOVABLE_API_KEY']` (provisioned, already used in production paths).
- `src/lib/snap-analyze.functions.ts` / `plan.functions.ts` — existing
  `createServerFn` pattern calling gateway chat models with multimodal content.
- No existing audio/mic backend, no `getUserMedia`/`MediaRecorder` usage yet.
- No storage bucket needed for this flow (short clips, transcribed immediately).

## Recommended architecture: MediaRecorder + server-side transcription fallback

Keep the Web Speech API as the fast path (Chrome/Edge/Android desktop-class
browsers), and add a universal fallback that works on iPhone:

```text
Mic tapped
 ├─ SpeechRecognition available? → live interim transcription (existing code)
 └─ Not available (iPhone) → record audio via getUserMedia + MediaRecorder
        → tap again stops recording
        → audio (base64) → createServerFn transcribeVoice
        → Lovable AI gateway: google/gemini-* (accepts audio input) → transcript text
        → append transcript into the request textarea
```

Why Gemini-via-gateway and not Whisper: the Lovable AI gateway does not serve
Whisper; its Gemini chat models accept audio parts, and iOS Safari's
`MediaRecorder` produces `audio/mp4`, which Gemini accepts. One model call,
no new secrets, reuses the exact pattern already in `snap-analyze.functions.ts`.

### Implementation outline

1. **`src/lib/transcribe-voice.functions.ts`** (new) — `createServerFn` POST
   accepting `{ audioDataUrl, mimeType }` (base64, size-capped ~8–10 MB ≈ 1–2 min
   of speech; reject larger). Handler reads `LOVABLE_API_KEY` inside the handler,
   calls the gateway Gemini model with an audio part + "transcribe verbatim,
   return only the transcript" prompt, returns `{ text }`. Errors surface
   honestly (per gateway error semantics: 429/5xx retryable, others terminal).
2. **`OutcomeComposer.tsx`** — replace the "unsupported" dead-end:
   - If `SpeechRecognition` exists → current behavior, unchanged.
   - Else if `navigator.mediaDevices.getUserMedia` + `MediaRecorder` exist →
     record on tap, stop on second tap, show "Transcribing…" state, append
     returned text to the textarea. Same visual listening state, plus a
     "Sending audio…" state.
   - Else (no mic APIs at all) → keep the friendly unsupported message.
   - New inline error messages: mic permission denied (NotAllowedError),
     no audio captured, transcription failed → "Voice had trouble — please type instead."
   - Keep abort/cleanup on unmount (stop tracks, cancel recorder).
3. **Mobile-first details**: request `{ audio: true }` only on tap (iOS requires
   a user gesture — satisfied); release the mic immediately on stop so the red
   recording indicator disappears; cap recording length (~60s) with auto-stop.

### Verification steps

- Confirm the gateway accepts an audio input part on the chosen Gemini model id
  (first implementation step: one real call with a tiny audio clip; adjust the
  model id if the gateway rejects it).
- Typecheck + browser checks at 390px/1440px: unsupported→recorder path,
  permission-denied simulation, no console errors, no overflow.
- Real-device sanity note: actual iPhone mic behavior can only be fully
  confirmed on-device, since headless Chromium can't emulate Safari's
  MediaRecorder/permission stack.

## Preview vs publish

**Publishing is NOT required for the mic to work in preview.** `createServerFn`
handlers and `LOVABLE_API_KEY` are available in the preview environment (the
existing Snap AI analysis already works there). The mic will work at the preview
URL immediately after the change; publishing is only needed to ship it to
getperfectboy.com — and per instruction, no publish will happen.

## Out of scope (unchanged)

- No database/schema changes, no Supabase storage.
- No changes to the Web Speech API fast path, submit behavior, or other UI.
