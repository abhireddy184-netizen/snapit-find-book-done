import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Camera, Mic, Sparkles } from "lucide-react";
import { LocationAutocomplete } from "@/components/snapit/LocationAutocomplete";

const EXAMPLES = [
  "I need dinner, groceries, and to be at DFW by 6 PM.",
  "My parents arrive tomorrow. Get my apartment ready and pick them up.",
  "I’m moving Saturday. Coordinate packing, movers, junk removal and cleaning.",
  "My car is making a strange noise. Handle it.",
  "Guests at 6pm — deep clean the living room and bath.",
];

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

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

type VoiceStatus = "idle" | "listening" | "denied" | "no-speech" | "error";

const VOICE_MESSAGES: Record<Exclude<VoiceStatus, "idle" | "listening">, string> = {
  denied: "Microphone access was blocked. Allow it in your browser settings to use voice input.",
  "no-speech": "I didn’t catch that — tap the mic and try again.",
  error: "Voice input had trouble. Please try again or type instead.",
};

/**
 * Outcome-first hero composer. Multi-part requests become one coordinated GPB
 * plan on /plan; the existing /search catalogue stays available as a fallback.
 */
export function OutcomeComposer() {
  const navigate = useNavigate();
  const [request, setRequest] = useState("");
  const [loc, setLoc] = useState("");
  const [i, setI] = useState(0);
  const paused = useRef(false);

  // Voice input state
  const SR = getSpeechRecognition();
  const voiceSupported = SR !== null;
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>("idle");
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  // Text the recognition session started with — finals append onto this.
  const baseTextRef = useRef("");
  const listening = voiceStatus === "listening";

  useEffect(() => {
    const t = window.setInterval(() => {
      if (!paused.current) setI((v) => (v + 1) % EXAMPLES.length);
    }, 3800);
    return () => window.clearInterval(t);
  }, []);

  // Always tear down recognition on unmount.
  useEffect(() => {
    return () => {
      recRef.current?.abort();
      recRef.current = null;
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

  const toggleVoice = () => {
    if (listening) {
      stopListening();
      return;
    }
    if (!SR) return;

    const rec = new SR();
    recRef.current = rec;
    baseTextRef.current = request.trim();
    rec.lang = "en-US";
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

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (listening) stopListening();
    const q = request.trim();
    void navigate({ to: "/plan", search: { q, loc: loc.trim() } });
  };

  const micTitle = !voiceSupported
    ? "Voice input isn’t supported in this browser — type instead"
    : listening
      ? "Stop voice input"
      : "Use voice input";

  return (
    <form
      onSubmit={submit}
      data-analytics-id="outcome_composer"
      className="rounded-[26px] border border-border/60 bg-card p-3 shadow-[var(--shadow-elevated)] sm:p-4"
    >
      <label htmlFor="gpb-outcome" className="sr-only">
        Describe the outcome or the day you need handled
      </label>
      <div className="relative">
        <textarea
          id="gpb-outcome"
          value={request}
          onChange={(e) => setRequest(e.target.value)}
          onFocus={() => (paused.current = true)}
          onBlur={() => (paused.current = false)}
          rows={3}
          placeholder={EXAMPLES[i]}
          className="min-h-[102px] w-full resize-none rounded-2xl bg-muted/40 px-4 py-3.5 pr-12 text-[15px] leading-relaxed outline-none transition-colors placeholder:text-muted-foreground focus:bg-muted/60"
        />
        <button
          type="button"
          onClick={toggleVoice}
          aria-label={micTitle}
          title={micTitle}
          aria-pressed={listening}
          className={`absolute right-2.5 top-2.5 grid h-9 w-9 place-items-center rounded-full border transition-all ${
            listening
              ? "animate-pulse border-primary bg-primary text-primary-foreground shadow-md"
              : voiceSupported
                ? "border-border/70 bg-background text-muted-foreground hover:text-primary"
                : "cursor-not-allowed border-border/70 bg-background text-muted-foreground opacity-50"
          }`}
        >
          <Mic className="h-4 w-4" />
        </button>
      </div>

      <p aria-live="polite" className="sr-only">
        Example request: {EXAMPLES[i]}
      </p>
      <p aria-live="polite" role="status" className="sr-only">
        {listening ? "Listening… speak your request, then tap the mic again to stop." : ""}
      </p>

      {(listening || (!voiceSupported && voiceStatus !== "idle") || voiceStatus in VOICE_MESSAGES) && (
        <p className={`mt-1.5 text-xs font-semibold ${listening ? "text-primary" : "text-muted-foreground"}`}>
          {listening
            ? "Listening… tap the mic again when you’re done."
            : voiceStatus in VOICE_MESSAGES
              ? VOICE_MESSAGES[voiceStatus as keyof typeof VOICE_MESSAGES]
              : "Voice input isn’t supported in this browser — type your request instead."}
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
