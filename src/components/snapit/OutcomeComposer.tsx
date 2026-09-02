import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, Mic, Sparkles, Square } from "lucide-react";
import { LocationAutocomplete } from "@/components/snapit/LocationAutocomplete";
import { transcribeVoice } from "@/lib/transcribe-voice.functions";
import { startVoiceActivityMonitor, type VoiceActivityMonitor } from "@/lib/voice-activity";
import { StableTranscript } from "@/lib/stable-transcript";


const EXAMPLES = [
  "My kitchen sink is leaking under the cabinet.",
  "I need a deep clean of a 2-bedroom apartment on Saturday.",
  "Moving next weekend — need movers and packing help.",
  "My TV won’t turn on. Can someone look at it?",
  "Need someone to pick up a parcel and drop it at the post office.",
];


const MAX_RECORD_MS = 60_000;
// Rolling provisional transcription while the user is still speaking.
const PARTIAL_CHUNK_MS = 1_000;
// Adaptive cadence: quick first feedback, backing off as the clip grows so a
// long recording doesn't re-upload big audio every couple of seconds.
const PARTIAL_MIN_MS = 1_800;
const PARTIAL_MAX_MS = 4_000;
const MIN_PARTIAL_BYTES = 6_000;
/**
 * After a voice request is finalized, GPB builds the plan on its own if the
 * person stays silent. Armed only after a real spoken transcript, never from
 * typing, and cancellable from the UI or by editing the text.
 */
const AUTO_SUBMIT_SECONDS = 10;
/** Too short to be a real request — never auto-submit noise. */
const MIN_AUTO_SUBMIT_CHARS = 4;



type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: { transcript: string };
};
type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
};
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

/**
 * Script-range test rather than a language list: matches Arabic, Hebrew,
 * Syriac, Thaana, N'Ko and the Arabic supplements/presentation forms.
 */
const RTL_RANGE =
  /[\u0590-\u05FF\u0600-\u06FF\u0700-\u074F\u0780-\u07BF\u07C0-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;
export function isRtlText(text: string): boolean {
  return RTL_RANGE.test(text);
}

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function canRecordAudio(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function" &&
    typeof MediaRecorder !== "undefined"
  );
}

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") {
    return "";
  }
  // iOS Safari records audio/mp4; Chrome/Firefox record webm/ogg.
  for (const t of ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"]) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read failed"));
    reader.onload = () => {
      const url = String(reader.result ?? "");
      resolve(url.slice(url.indexOf(",") + 1));
    };
    reader.readAsDataURL(blob);
  });
}

type VoiceStatus =
  | "idle"
  | "listening"
  | "transcribing"
  | "denied"
  | "no-speech"
  | "unsupported"
  | "error";

const VOICE_MESSAGES: Record<Exclude<VoiceStatus, "idle" | "listening" | "transcribing">, string> = {
  denied: "Microphone access was blocked. Allow it in your browser settings to use voice input.",
  "no-speech": "I didn’t catch that — tap the mic and try again.",
  unsupported: "Voice input isn’t supported in this browser — type your request instead.",
  error: "Voice input had trouble. Please try again or type instead.",
};

/**
 * Outcome-first hero composer. Multi-part requests become one coordinated GPB
 * plan on /plan; the existing /search catalogue stays available as a fallback.
 *
 * Voice input: Web Speech API where available (Chrome/Edge/Android); on iPhone
 * Safari and other browsers without it, a short MediaRecorder clip is sent to a
 * server function that transcribes it via the Lovable AI gateway.
 */
export function OutcomeComposer() {
  const navigate = useNavigate();
  const [request, setRequest] = useState("");
  const [loc, setLoc] = useState("");
  const [i, setI] = useState(0);
  /** Set when someone submits an empty request — /plan would silently show the demo. */
  const [emptyError, setEmptyError] = useState(false);
  const paused = useRef(false);


  // Voice input state — capabilities are detected after mount to avoid SSR/client mismatch.
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>("idle");
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const mediaRef = useRef<{ recorder: MediaRecorder; stream: MediaStream } | null>(null);
  const recordTimerRef = useRef<number | null>(null);
  // Local silence detection for the current clip (never runs outside a session).
  const vadRef = useRef<VoiceActivityMonitor | null>(null);
  // Guards so manual stop and automatic stop can't stop/transcribe twice.
  const stopRequestedRef = useRef(false);
  const discardRef = useRef(false);
  // Rolling provisional transcription (MediaRecorder path).
  const partialTimerRef = useRef<number | null>(null);
  const partialSeqRef = useRef(0);
  const partialInFlightRef = useRef(false);
  const finalizedRef = useRef(false);
  // Append-only merge of provisional passes, so committed words never vanish.
  const stableRef = useRef<StableTranscript | null>(null);
  // Text the recognition session started with — finals append onto this.
  const baseTextRef = useRef("");
  /** Seconds left before GPB builds the plan on its own; null = not armed. */
  const [autoSecs, setAutoSecs] = useState<number | null>(null);
  const autoTimerRef = useRef<number | null>(null);
  /** Exactly-once guard so auto and manual submit can never both fire. */
  const submittedRef = useRef(false);

  const listening = voiceStatus === "listening";
  const transcribing = voiceStatus === "transcribing";

  const cancelAutoSubmit = () => {
    if (autoTimerRef.current !== null) {
      window.clearInterval(autoTimerRef.current);
      autoTimerRef.current = null;
    }
    setAutoSecs(null);
  };

  /** Armed only from a finalized spoken transcript, never from typing. */
  const armAutoSubmit = (text: string) => {
    if (text.trim().length < MIN_AUTO_SUBMIT_CHARS) return;
    if (autoTimerRef.current !== null) window.clearInterval(autoTimerRef.current);
    setAutoSecs(AUTO_SUBMIT_SECONDS);
    autoTimerRef.current = window.setInterval(() => {
      setAutoSecs((s) => (s === null ? null : s - 1));
    }, 1000);
  };


  useEffect(() => {
    // Examples rotate only while the composer is idle — never during voice input.
    if (voiceStatus === "listening" || voiceStatus === "transcribing") return;
    const t = window.setInterval(() => {
      if (!paused.current) setI((v) => (v + 1) % EXAMPLES.length);
    }, 3800);
    return () => window.clearInterval(t);
  }, [voiceStatus]);


  // Feature-detect voice input on mount (avoids SSR hydration mismatch).
  useEffect(() => {
    setVoiceSupported(getSpeechRecognition() !== null || canRecordAudio());
  }, []);

  const stopRecordingResources = () => {
    if (recordTimerRef.current !== null) {
      window.clearTimeout(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (partialTimerRef.current !== null) {
      window.clearTimeout(partialTimerRef.current);
      partialTimerRef.current = null;
    }
    vadRef.current?.stop();
    vadRef.current = null;
    const m = mediaRef.current;
    mediaRef.current = null;
    m?.stream.getTracks().forEach((t) => t.stop());
  };

  // Always tear down recognition/recording on unmount.
  useEffect(() => {
    return () => {
      recRef.current?.abort();
      recRef.current = null;
      const m = mediaRef.current;
      if (m && m.recorder.state !== "inactive") {
        try {
          m.recorder.stop();
        } catch {
          /* ignore */
        }
      }
      stopRecordingResources();
      if (autoTimerRef.current !== null) window.clearInterval(autoTimerRef.current);
    };
  }, []);


  const stopListening = () => {
    const rec = recRef.current;
    recRef.current = null;
    if (rec) {
      try {
        rec.stop();
      } catch {
        /* already stopped */
      }
    }
    setVoiceStatus((s) => (s === "listening" ? "idle" : s));
  };

  /* ---------- Web Speech API path ---------- */

  const startSpeechRecognition = (Ctor: SpeechRecognitionCtor) => {
    const rec = new Ctor();
    recRef.current = rec;
    baseTextRef.current = request.trim();
    // Use the visitor's own browser locale rather than a hard-coded en-US.
    rec.lang = (typeof navigator !== "undefined" && navigator.language) || "en-US";

    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;

    // Accumulated final segments for this session; interim shows live.
    let finals = "";
    // Latest text this session produced — used to arm the silent countdown.
    let lastText = "";

    rec.onresult = (e) => {
      let interim = "";
      for (let idx = e.resultIndex; idx < e.results.length; idx++) {
        const r = e.results[idx];
        if (!r) continue;
        if (r.isFinal) finals += r[0].transcript;
        else interim += r[0].transcript;
      }
      const spoken = (finals + interim).trim();
      const base = baseTextRef.current;
      const next = base ? (spoken ? `${base} ${spoken}` : base) : spoken;
      lastText = next;
      setRequest(next);
    };

    rec.onerror = (e) => {
      recRef.current = null;
      const err = e?.error ?? "";
      if (err === "not-allowed" || err === "service-not-allowed") setVoiceStatus("denied");
      else if (err === "no-speech") setVoiceStatus("no-speech");
      else if (err === "aborted") setVoiceStatus("idle");
      else setVoiceStatus("error");
    };

    rec.onend = () => {
      recRef.current = null;
      setVoiceStatus((s) => (s === "listening" ? "idle" : s));
      // Only when this session actually recognised speech.
      if (finals.trim()) armAutoSubmit(lastText);
    };


    try {
      rec.start();
      setVoiceStatus("listening");
    } catch {
      recRef.current = null;
      setVoiceStatus("error");
    }
  };

  /* ---------- MediaRecorder + server transcription path (iPhone Safari) ---------- */

  /**
   * Ends the clip exactly once. `discard` is used by the no-speech timeout so we
   * never send an empty clip to the transcriber.
   */
  const stopRecordingAndTranscribe = (discard = false) => {
    const m = mediaRef.current;
    if (!m || stopRequestedRef.current) return;
    stopRequestedRef.current = true;
    discardRef.current = discard;
    // Stop the analyser immediately; the recorder's onstop does the rest.
    // Any provisional transcription still in flight is now stale.
    partialSeqRef.current += 1;
    if (partialTimerRef.current !== null) {
      window.clearTimeout(partialTimerRef.current);
      partialTimerRef.current = null;
    }
    vadRef.current?.stop();
    vadRef.current = null;
    try {
      if (m.recorder.state !== "inactive") m.recorder.stop();
      else stopRecordingResources();
    } catch {
      setVoiceStatus("error");
      stopRecordingResources();
    }
  };

  const startRecording = async () => {
    baseTextRef.current = request.trim();
    stopRequestedRef.current = false;
    discardRef.current = false;
    finalizedRef.current = false;
    partialInFlightRef.current = false;
    stableRef.current = new StableTranscript();
    partialSeqRef.current += 1;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      const name = (err as { name?: string } | null)?.name ?? "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        setVoiceStatus("denied");
        return;
      }
      // No usable recorder (no mic, hardware busy) — fall back to browser speech recognition.
      const Ctor = getSpeechRecognition();
      if (Ctor) startSpeechRecognition(Ctor);
      else setVoiceStatus("error");
      return;
    }


    const mimeType = pickMimeType();
    let recorder: MediaRecorder;
    try {
      recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    } catch {
      stream.getTracks().forEach((t) => t.stop());
      setVoiceStatus("error");
      return;
    }

    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = async () => {
      const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || "audio/mp4" });
      const discarded = discardRef.current;
      finalizedRef.current = true;
      stopRecordingResources();
      if (discarded || blob.size < 200) {
        setVoiceStatus("no-speech");
        return;
      }
      setVoiceStatus("transcribing");
      try {
        const audioDataBase64 = await blobToBase64(blob);
        const res = await transcribeVoice({
          data: { audioDataBase64, mimeType: blob.type || "audio/mp4" },
        });
        const spoken = res.text.trim();
        if (!spoken) {
          setVoiceStatus("no-speech");
          return;
        }
        const base = baseTextRef.current;
        const finalText = base ? `${base} ${spoken}` : spoken;
        setRequest(finalText);
        setVoiceStatus("idle");
        // Authoritative transcript is in — start the silent countdown.
        armAutoSubmit(finalText);

      } catch (err) {
        console.error("[gpb voice] transcription failed", err);
        setVoiceStatus("error");
      }
    };

    /**
     * Rolling provisional transcript: on an adaptive cadence we transcribe the
     * audio captured *so far* (all timeslice chunks concatenated, so the container
     * header from the first chunk is always present — valid on both webm/Chrome and
     * fragmented mp4/iOS Safari). Each pass is merged append-only through
     * StableTranscript, so words the user has already seen never disappear when
     * the model rewords the tail. Stale/late responses are dropped.
     */
    const runPartial = async () => {
      const seq = partialSeqRef.current;
      if (finalizedRef.current || stopRequestedRef.current) return;
      if (partialInFlightRef.current) return;
      if (chunks.length === 0) return;
      const blob = new Blob(chunks.slice(), { type: recorder.mimeType || mimeType || "audio/mp4" });
      if (blob.size < MIN_PARTIAL_BYTES) return;
      partialInFlightRef.current = true;
      try {
        const audioDataBase64 = await blobToBase64(blob);
        const res = await transcribeVoice({
          data: { audioDataBase64, mimeType: blob.type || "audio/mp4" },
        });
        // Drop stale responses: newer session, or the final transcript already won.
        if (seq !== partialSeqRef.current || finalizedRef.current) return;
        const spoken = res.text.trim();
        if (!spoken) return;
        const merged = (stableRef.current ??= new StableTranscript()).push(spoken);
        if (!merged) return;
        const base = baseTextRef.current;
        setRequest(base ? `${base} ${merged}` : merged);
      } catch {
        // Provisional only — silence failures and let the final transcription decide.
      } finally {
        partialInFlightRef.current = false;
      }
    };

    // Self-scheduling instead of a fixed interval: the clip grows with time, so
    // back the cadence off as the upload gets larger (bounded API usage).
    const startedAt = Date.now();
    const scheduleNextPartial = () => {
      const elapsed = Date.now() - startedAt;
      const delay = Math.min(PARTIAL_MAX_MS, Math.max(PARTIAL_MIN_MS, elapsed / 4));
      partialTimerRef.current = window.setTimeout(() => {
        void runPartial().finally(() => {
          if (!finalizedRef.current && !stopRequestedRef.current) scheduleNextPartial();
        });
      }, delay);
    };

    mediaRef.current = { recorder, stream };
    try {
      // Timeslice so partial data is available while the user is still speaking.
      recorder.start(PARTIAL_CHUNK_MS);
      setVoiceStatus("listening");
      scheduleNextPartial();

      // Hard maximum, unchanged.
      recordTimerRef.current = window.setTimeout(() => stopRecordingAndTranscribe(), MAX_RECORD_MS);
      // Local level detection: stop on end-of-speech, or if nothing is ever said.
      // If it can't initialise, recording still works with manual second-tap stop.
      vadRef.current = startVoiceActivityMonitor(stream, {
        onSpeechEnd: () => stopRecordingAndTranscribe(),
        onNoSpeech: () => stopRecordingAndTranscribe(true),
      });
    } catch {
      stopRecordingResources();
      setVoiceStatus("error");
    }
  };

  /* ---------- shared toggle ---------- */

  const toggleVoice = () => {
    if (transcribing) return;
    // Any new mic interaction supersedes a pending auto-submit.
    cancelAutoSubmit();
    if (listening) {
      if (recRef.current) stopListening();
      else stopRecordingAndTranscribe();
      return;
    }
    // AI transcription is the preferred path everywhere it can run: it auto-detects
    // the spoken language and copes with accents and code-switched speech.
    if (canRecordAudio()) {
      void startRecording();
      return;
    }
    const Ctor = getSpeechRecognition();
    if (Ctor) {
      startSpeechRecognition(Ctor);
    } else {
      setVoiceStatus("unsupported");
    }

  };

  /** Single exit point for both manual submit and the silent countdown. */
  const goToService = (text: string) => {
    const q = text.trim();
    if (!q || submittedRef.current) return;
    submittedRef.current = true;
    cancelAutoSubmit();
    setEmptyError(false);
    // Photo, voice and text all converge on the same service understanding flow.
    void navigate({ to: "/snap", search: { q, loc: loc.trim() } });
  };


  // Countdown reaching zero builds the plan — never a booking, order or message.
  useEffect(() => {
    if (autoSecs === null) return;
    if (autoSecs > 0) return;
    cancelAutoSubmit();
    goToService(request);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSecs]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (listening) {
      if (recRef.current) stopListening();
      else stopRecordingAndTranscribe();
    }
    const q = request.trim();
    // An empty request lands on /plan's demo plan, which reads like a real
    // answer to a request that was never made. Ask for the words instead.
    if (!q) {
      cancelAutoSubmit();
      setEmptyError(true);
      document.getElementById("gpb-outcome")?.focus();
      return;
    }
    goToService(q);
  };



  const micTitle = !voiceSupported
    ? "Voice input isn’t supported in this browser — type instead"
    : listening
      ? "Stop voice input now"
      : transcribing
        ? "Transcribing your voice…"
        : "Use voice input — speak any language";

  const statusLine = listening
    ? "Listening… speak in any language — it stops on its own when you finish."
    : transcribing
      ? "Transcribing your voice…"
      : voiceStatus in VOICE_MESSAGES
        ? VOICE_MESSAGES[voiceStatus as keyof typeof VOICE_MESSAGES]
        : null;


  const voiceActive = listening || transcribing;

  return (
    <form
      onSubmit={submit}
      data-analytics-id="outcome_composer"
      className="rounded-[26px] border border-border/60 bg-card p-3 shadow-[var(--shadow-elevated)] sm:p-4"
    >
      <label htmlFor="gpb-outcome" className="sr-only">
        Describe the outcome or the day you need handled
      </label>
      {/* Direction follows what the person actually typed: any RTL script
          (Arabic, Hebrew, Urdu, Persian, …) flips the text and the logical
          padding so the mic button never sits on top of the first characters. */}
      <div dir={isRtlText(request) ? "rtl" : "ltr"} className="relative">
        <textarea
          id="gpb-outcome"
          dir="auto"
          value={request}
          onChange={(e) => {
            setRequest(e.target.value);
            if (emptyError) setEmptyError(false);
            // Editing means the person is still composing — stand down.
            if (autoSecs !== null) cancelAutoSubmit();
          }}

          onFocus={() => (paused.current = true)}
          onBlur={() => (paused.current = false)}
          rows={3}
          aria-invalid={emptyError}
          aria-describedby={emptyError ? "gpb-outcome-error" : undefined}
          /* While the mic is active the rotating examples stop competing with
             what the person is actually saying. */
          placeholder={voiceActive ? "" : EXAMPLES[i]}
          className={`min-h-[96px] w-full resize-none rounded-2xl bg-muted/40 px-4 py-3 pe-[3.5rem] text-[15px] leading-relaxed outline-none transition-colors placeholder:text-muted-foreground focus:bg-muted/60 sm:min-h-[102px] sm:py-3.5 sm:pe-16 ${
            voiceActive ? "bg-primary/5 ring-2 ring-primary/60" : emptyError ? "ring-2 ring-destructive/70" : ""
          }`}
        />

        {voiceActive && !request && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-4 top-3.5 text-[15px] leading-relaxed text-primary/70"
          >
            {listening ? "Listening… speak now" : "Transcribing…"}
          </span>
        )}
        <button
          type="button"
          onClick={toggleVoice}
          aria-label={micTitle}
          title={micTitle}
          aria-pressed={listening}
          disabled={transcribing}
          className={`absolute end-2 top-2 grid h-12 w-12 shrink-0 place-items-center rounded-full border transition-all sm:end-2.5 sm:top-2.5 ${

            listening
              ? "animate-pulse border-primary bg-primary text-primary-foreground shadow-md"
              : transcribing
                ? "cursor-wait border-primary/50 bg-primary/10 text-primary"
                : voiceSupported
                  ? "border-border/70 bg-background text-muted-foreground hover:text-primary"
                  : "cursor-not-allowed border-border/70 bg-background text-muted-foreground opacity-50"
          }`}
        >
          {listening ? (
            <Square className="h-4 w-4 fill-current" />
          ) : transcribing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Mic className="h-4 w-4" />
          )}
        </button>
      </div>

      <p aria-live="polite" className="sr-only">
        Example request: {EXAMPLES[i]}
      </p>
      <p aria-live="polite" role="status" className="sr-only">
        {statusLine ?? ""}
      </p>

      {statusLine && (
        <p dir="auto" className={`mt-1.5 text-xs font-semibold ${listening || transcribing ? "text-primary" : "text-muted-foreground"}`}>
          {statusLine}
        </p>
      )}
      {emptyError && (
        <p id="gpb-outcome-error" role="alert" className="mt-1.5 text-xs font-semibold text-destructive">
          Tell GPB what you need first — type it or tap the mic.
        </p>
      )}

      {autoSecs !== null && autoSecs > 0 && (
        <div
          role="status"
          aria-live="polite"
          className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-primary/30 bg-primary/5 px-3 py-2.5"
        >
          <p className="min-w-0 flex-1 text-xs font-bold text-primary">
            Building your plan in {autoSecs}s — say more or edit to keep going.
          </p>
          <button
            type="button"
            onClick={cancelAutoSubmit}
            className="min-h-[40px] shrink-0 rounded-full border border-border bg-background px-4 text-xs font-bold hover:bg-muted"
          >
            Keep editing
          </button>
          <button
            type="button"
            onClick={() => goToService(request)}
            className="min-h-[40px] shrink-0 rounded-full bg-primary px-4 text-xs font-bold text-primary-foreground"
          >
            Build now
          </button>
        </div>
      )}



      <div className="mt-2.5 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="min-w-0">
          <LocationAutocomplete
            value={loc}

            onChange={setLoc}
            aria-label="ZIP or city"
            placeholder="ZIP or city"
            fieldClassName="rounded-2xl bg-muted/40 px-4 py-3"
          />
        </div>
        <button
          type="submit"
          data-analytics-id="outcome_submit"
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-black text-white shadow-lg transition-transform hover:scale-[1.01] sm:w-auto"
          style={{ background: "var(--gradient-primary)" }}
        >
          <Sparkles className="h-4 w-4" /> Build my plan
        </button>
      </div>

      <div className="mt-3 border-t border-border/60 pt-3">
        <Link
          to="/snap"
          data-analytics-id="show_gpb_cta"
          data-analytics-location="hero_composer"
          className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground transition-colors hover:text-primary"
        >
          <Camera className="h-4 w-4 text-primary" /> Or show GPB a photo
        </Link>
      </div>

    </form>
  );
}

export default OutcomeComposer;
