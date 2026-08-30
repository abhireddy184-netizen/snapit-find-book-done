# Voice provisional transcript: why it stutters, and the fix

## What the code does today

`OutcomeComposer.tsx` uses the AI transcription path on every device that can record audio (Web Speech is only a fallback). While recording:

- `recorder.start(1000)` collects 1s chunks.
- Every 2.5s a timer re-transcribes **the whole clip so far** (all chunks concatenated) via `transcribeVoice`.
- The response **replaces** the composer text (`base + spoken`).
- Guards: skip if a previous partial is still in flight, skip if under 6 KB, drop stale/late responses.

## Likely root cause of the reported symptoms

1. **Slow / bursty text.** Each partial is a full re-transcription round trip: base64 encode the growing clip, upload, model runs on the entire audio, return. With a 2.5s tick plus the in-flight lock, effective updates land every ~3–5s and grow slower as the clip lengthens (the audio re-sent doubles, triples...). So words arrive in clumps, not word-by-word.
2. **Words disappearing then reappearing.** Because each partial is an independent whole-clip transcription, the model can revise earlier wording as more context arrives (and truncated final audio at the cut point produces a shorter/garbled tail). Since the result *replaces* the text, a later pass that is shorter or differently worded visibly deletes words the user already saw. This is a rewrite artifact, not a race.
3. **iPhone Safari specifics.** Safari emits fragmented MP4 timeslices; only the concatenation is decodable, so the whole-clip re-send is currently the only workable shape. Safari has no `SpeechRecognition`, so no true streaming path exists. Also each partial is billed and rate-limit-shared, so shortening the interval alone makes it worse, not better.

## Recommended approach

Move from "re-transcribe everything and replace" to **append-only committed segments with a small live tail**:

1. **Commit boundary.** Keep a `committedText` string. Each partial still transcribes the whole clip (required for a valid container), but instead of replacing, compute the longest common prefix with the committed text and only ever **extend** it — never shorten. If a new pass is shorter or diverges after the prefix, keep the committed prefix and replace only the trailing, uncommitted portion.
2. **Stability rule.** Only promote a trailing fragment to committed once two consecutive passes agree on it. Unstable tail is rendered as dimmed/provisional text, so revisions happen visibly in the tail only, never in text the user already accepted.
3. **Smoother cadence.** Drop the tick to ~1.8s while the clip is short and back off as it grows (e.g. interval = clamp(1.8s, clipSeconds/4, 4s)) so early feedback is fast and long clips stay within rate limits.
4. **Final pass wins only by appending.** On stop, the final full transcription replaces the provisional tail but keeps the committed prefix if the final is a superset; otherwise take the final verbatim (it is the authoritative one).
5. **Multilingual safety.** Prefix/suffix comparison is done on Unicode grapheme/whitespace boundaries only — no language, script, or romanization assumptions, no normalization that would collapse Telugu/Devanagari/Arabic text. The prompt and auto-detection in `transcribe-voice.functions.ts` stay untouched.
6. **UI honesty.** Committed text in normal weight, unstable tail dimmed, plus the existing Listening/Transcribing state. Mobile-first, no layout shift when the tail changes length.

### Known browser limitation

iPhone Safari cannot stream word-by-word: there is no `SpeechRecognition` and MediaRecorder gives no independently decodable fragments. The best achievable there is 1.5–3s stepped updates. The proposal makes those steps feel continuous by guaranteeing text only grows, which removes the flicker even though the underlying cadence stays stepped.

## Out of scope

No changes to VAD, mic state machine, prompt, planner, or any non-voice UI. Preview only, no publish.
