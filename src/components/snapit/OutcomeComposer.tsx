import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, Mic, Sparkles, Square } from "lucide-react";
import { LocationAutocomplete } from "@/components/snapit/LocationAutocomplete";
import { transcribeVoice } from "@/lib/transcribe-voice.functions";
import { startVoiceActivityMonitor, type VoiceActivityMonitor } from "@/lib/voice-activity";

const EXAMPLES = [
  "I need dinner, groceries, and to be at DFW by 6 PM.",
  "My parents arrive tomorrow. Get my apartment ready and pick them up.",
  "I’m moving Saturday. Coordinate packing, movers, junk removal and cleaning.",
  "My car is making a strange noise. Handle it.",
  "Guests at 6pm — deep clean the living room and bath.",
];

const MAX_RECORD_MS = 60_000;

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
  // Text the recognition session started with — finals append onto this.
  const baseTextRef = useRef("");
  const listening = voiceStatus === "listening";
  const transcribing = voiceStatus === "transcribing";

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
        setRequest(base ? `${base} ${spoken}` : spoken);
        setVoiceStatus("idle");
      } catch (err) {
        console.error("[gpb voice] transcription failed", err);
        setVoiceStatus("error");
      }
    };

    mediaRef.current = { recorder, stream };
    try {
      recorder.start();
      setVoiceStatus("listening");
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

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (listening) {
      if (recRef.current) stopListening();
      else stopRecordingAndTranscribe();
    }
    const q = request.trim();
    void navigate({ to: "/plan", search: { q, loc: loc.trim() } });
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
          onChange={(e) => setRequest(e.target.value)}
          onFocus={() => (paused.current = true)}
          onBlur={() => (paused.current = false)}
          rows={3}
          /* While the mic is active the rotating examples stop competing with
             what the person is actually saying. */
          placeholder={voiceActive ? "" : EXAMPLES[i]}
          className={`min-h-[112px] w-full resize-none rounded-2xl bg-muted/40 px-4 py-3.5 pe-[3.75rem] text-[15px] leading-relaxed outline-none transition-colors placeholder:text-muted-foreground focus:bg-muted/60 sm:min-h-[102px] sm:pe-16 ${
            voiceActive ? "bg-primary/5 ring-2 ring-primary/60" : ""
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
