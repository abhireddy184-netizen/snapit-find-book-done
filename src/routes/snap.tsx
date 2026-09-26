import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Camera,
  Video,
  Upload,
  Sparkles,
  Loader2,
  ShieldAlert,
  Clock,
  DollarSign,
  MapPin,
  Star,
  ShieldCheck,
  ArrowRight,
  RotateCcw,
  Zap,
  Timer,
  ScanLine,
  CheckCircle2,
  MessageCircle,
  Phone,
  Award,
  Send,
  Check,
  X,
  History as HistoryIcon,
  ClipboardList,
  CalendarClock,
} from "lucide-react";
import { AppShell, Avatar, GradientButton } from "@/components/snapit/AppShell";
import { analyzeSnap, type SnapAnalysis } from "@/lib/snap-analyze.functions";
import { getCategoryBySlug } from "@/lib/catalog";
import { detectServiceIntentInText, matchServiceIntent, rankServices } from "@/lib/search-intent";
import { createFastPathAnalysis, createLocalOptionsAnalysis } from "@/lib/snap-fast-path";
import { fetchBookableProviders, type ProviderMatch } from "@/lib/providers";
import { extractZip, isZipCode, lookupZip } from "@/lib/us-zip";
import { saveHistoryEntry, loadHistory, formatRelative, type SnapHistoryEntry } from "@/lib/snap-history";
import { useAuth } from "@/lib/auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { createJobFromAnalysis } from "@/lib/jobs";
import { prepareMediaForAnalysis, withTimeout, type PreparedMedia } from "@/lib/snap-media";
import {
  BadgeCheck,
  Lock,
  HandHeart,
  Tag,
  Users,
} from "lucide-react";

/** Hard ceiling for a single AI diagnosis request before we bail out. */
// Text-only requests are fast (no visual pipeline); media needs more room.
const ANALYSIS_TIMEOUT_MS = 34_000;
const TEXT_ANALYSIS_TIMEOUT_MS = 6_000;

type SnapSearch = { q?: string; loc?: string };

export const Route = createFileRoute("/snap")({
  validateSearch: (search: Record<string, unknown>): SnapSearch => {
    const q = typeof search["q"] === "string" ? search["q"] : "";
    const loc = search["loc"] == null ? "" : String(search["loc"]).replace(/["'“”‘’]/g, "").replace(/\s+/g, " ").trim();
    return { ...(q ? { q } : {}), ...(loc ? { loc } : {}) };
  },

  head: () => ({
    meta: [
      { title: "Show us the problem — AI diagnosis in seconds | GetPros" },
      { name: "description", content: "Snap a photo or video of any problem. GetPros's AI explains what it likely needs, builds a standardized job scope and helps you compare quotes from service pros." },
      { property: "og:title", content: "Snap a Problem — AI diagnosis | GetPros" },
      { property: "og:description", content: "Point your camera. Get an instant diagnosis, estimate and matched pros." },
    ],
  }),
  component: SnapPage,
});


const urgencyStyles: Record<string, { chip: string; label: string; icon: typeof ShieldAlert }> = {
  emergency: { chip: "bg-red-100 text-red-700 border-red-200", label: "Emergency", icon: ShieldAlert },
  high: { chip: "bg-orange-100 text-orange-700 border-orange-200", label: "High priority", icon: Zap },
  medium: { chip: "bg-amber-100 text-amber-700 border-amber-200", label: "This week", icon: Clock },
  low: { chip: "bg-mint/25 text-mint-ink border-mint/40", label: "Whenever", icon: Clock },
};

function SnapPage() {
  // A spoken/typed service request handed over from the home composer (or an
  // old /plan link) arrives as ?q= — same flow, no separate planning step.
  const search = Route.useSearch();
  const incomingRequest = (search.q ?? "").trim();
  const incomingLoc = (search.loc ?? "").trim();
  const autoRanRef = useRef(false);

  const [image, setImage] = useState<string | null>(null);
  const [frames, setFrames] = useState<string[]>([]);
  const [mediaKind, setMediaKind] = useState<"photo" | "video" | "upload" | null>(null);
  const [note, setNote] = useState("");
  const [describeMode, setDescribeMode] = useState(incomingRequest.length > 0);
  const [describeText, setDescribeText] = useState(incomingRequest);
  const [textOnly, setTextOnly] = useState(false);

  const [analysis, setAnalysis] = useState<SnapAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "preparing" | "analyzing" | "matching">("idle");
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  // True while a typed request that already maps to a catalogue service is
  // resolving: it never touches the visual pipeline, so we show a short
  // transition instead of the full scanning sequence.
  const [fastPath, setFastPath] = useState(false);
  const isMobile = useIsMobile();
  // Mobile only: a freshly taken photo pauses here for Use photo / Retake
  // before anything is analysed. Desktop keeps its original behaviour.
  const [confirmPhoto, setConfirmPhoto] = useState(false);
  const analyze = useServerFn(analyzeSnap);
  const cameraRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  // Monotonic token: only the newest run is allowed to write state.
  const runRef = useRef(0);
  const busyRef = useRef(false);
  // Conversation memory so GetPros never re-asks a question or loses an answer.
  const [askedQuestions, setAskedQuestions] = useState<string[]>([]);
  const [turnCount, setTurnCount] = useState(0);
  const [recent, setRecent] = useState<SnapHistoryEntry[]>([]);
  useEffect(() => {
    setRecent(loadHistory().slice(0, 4));
  }, [analysis]);
  useEffect(() => () => {
    // Invalidate any in-flight run when the page unmounts.
    runRef.current += 1;
  }, []);
  // Tapping the center Show GP camera while this page is open: wipe the old
  // photo/result and immediately reopen the camera so the new shot replaces it.
  useEffect(() => {
    const recapture = () => {
      reset();
      requestAnimationFrame(() => cameraRef.current?.click());
    };
    window.addEventListener("getpros:recapture", recapture);
    return () => window.removeEventListener("getpros:recapture", recapture);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Release the temporary preview blob URL whenever it's replaced or cleared.
  useEffect(() => {
    if (!pendingPreview) return;
    return () => URL.revokeObjectURL(pendingPreview);
  }, [pendingPreview]);

  const runDiagnosis = async (
    frames: string[],
    noteText: string,
    token: number,
    opts?: { latestMessage?: string; asked?: string[]; turns?: number; forceResolve?: boolean },
  ) => {
    setPhase("analyzing");
    try {
      const payload = {
        ...(frames.length ? { imageDataUrls: frames } : {}),
        note: noteText,
        latestMessage: opts?.latestMessage,
        askedQuestions: opts?.asked ?? askedQuestions,
        turnCount: opts?.turns ?? turnCount,
        forceResolve: opts?.forceResolve ?? false,
      };
      const result = await withTimeout(
        analyze({ data: payload }),
        frames.length ? ANALYSIS_TIMEOUT_MS : TEXT_ANALYSIS_TIMEOUT_MS,
        "The AI is taking longer than usual. Please retry or send it again.",
      );
      if (runRef.current !== token) return;
      // Real stage change: understanding/finding is done, we now have a match.
      setPhase("matching");
      setAnalysis(result);
      if (result.clarifyingQuestions?.length) {
        setAskedQuestions((prev) => [...new Set([...prev, ...result.clarifyingQuestions!])].slice(0, 12));
      }
    } catch (e) {
      if (runRef.current !== token) return;
      // Text-only recovery: never leave the customer stuck — fall back to the
      // best local catalogue matches instead of a dead end.
      const local = frames.length ? null : createLocalOptionsAnalysis(noteText, rankServices(noteText, 4));
      if (local) {
        setPhase("matching");
        setAnalysis(local);
      } else {
        setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      }
    } finally {
      if (runRef.current === token) {
        setLoading(false);
        setPhase("idle");
        setPendingPreview(null);
      }
      if (runRef.current === token) busyRef.current = false;
    }
  };

  const handleFile = async (file: File, kind: "photo" | "video" | "upload") => {
    if (busyRef.current) return; // no duplicate concurrent runs
    busyRef.current = true;
    const token = ++runRef.current;
    setError(null);
    setAnalysis(null);
    setImage(null);
    setFrames([]);
    setTextOnly(false);
    setFastPath(false);
    setConfirmPhoto(false);
    setDescribeMode(false);
    setMediaKind(kind);
    setNote("");
    setAskedQuestions([]);
    setTurnCount(0);
    // Show the working state immediately — no dead period after capture.
    setLoading(true);
    setPhase("preparing");
    setPendingPreview(file.type.startsWith("video/") ? null : URL.createObjectURL(file));

    let prepared: PreparedMedia;
    try {
      prepared = await prepareMediaForAnalysis(file);
    } catch (e) {
      if (runRef.current === token) {
        setError(e instanceof Error ? e.message : "We couldn't prepare that file. Please try again.");
        setLoading(false);
        setPhase("idle");
        setPendingPreview(null);
        setMediaKind(null);
      }
      busyRef.current = false;
      return;
    }
    if (runRef.current !== token) {
      busyRef.current = false;
      return;
    }
    setImage(prepared.preview);
    setFrames(prepared.frames);
    if (isMobile && kind === "photo") {
      // Let the customer check the shot first: Use photo continues, Retake
      // reopens the rear camera.
      setConfirmPhoto(true);
      setLoading(false);
      setPhase("idle");
      setPendingPreview(null);
      busyRef.current = false;
      return;
    }
    await runDiagnosis(prepared.frames, "", token);
  };

  /** Mobile confirm step: accept the captured photo and start the diagnosis. */
  const acceptCapturedPhoto = async () => {
    if (busyRef.current) return;
    setConfirmPhoto(false);
    busyRef.current = true;
    const token = ++runRef.current;
    setError(null);
    setLoading(true);
    await runDiagnosis(frames, note, token, { latestMessage: note || undefined });
  };

  const runDiagnosisFresh = runDiagnosis;

  const runAnalysis = async () => {
    if (!image || busyRef.current) return;
    busyRef.current = true;
    const token = ++runRef.current;
    setLoading(true);
    setError(null);
    await runDiagnosisFresh(frames, note, token, { latestMessage: note });
  };

  /** Text/voice path — no photo required (essential on desktop). */
  const runTextAnalysis = async (override?: string) => {
    const typed = (override ?? describeText).trim();
    if (typed.length < 4 || busyRef.current) return;
    // The service location travels with the request so GetPros can match locally.
    const described = incomingLoc ? `${typed}\n(Service location: ${incomingLoc})` : typed;
    busyRef.current = true;
    const token = ++runRef.current;
    setError(null);
    setAnalysis(null);
    setImage(null);
    setMediaKind(null);
    setTextOnly(true);
    // A confident text-only catalog hit is resolved entirely in the browser.
    // It never enters the image pipeline or waits on the AI gateway.
    const deterministicHit = detectServiceIntentInText(typed) ?? matchServiceIntent(typed);
    setFastPath(Boolean(deterministicHit));
    setFrames([]);
    setNote(described);
    setAskedQuestions([]);
    setTurnCount(0);
    setLoading(true);
    if (deterministicHit) {
      // Enough information already: resolve immediately, no artificial delay.
      setAnalysis(createFastPathAnalysis(typed, deterministicHit));
      setLoading(false);
      setPhase("idle");
      busyRef.current = false;
      return;
    }
    await runDiagnosis([], described, token, { latestMessage: described, asked: [], turns: 0 });
  };

  /**
   * A request handed over from the home composer runs immediately — the person
   * already said what they need; asking them to press "go" again is friction.
   */
  useEffect(() => {
    if (!incomingRequest || autoRanRef.current) return;
    if (incomingRequest.length < 4) return;
    autoRanRef.current = true;
    void runTextAnalysis(incomingRequest);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingRequest]);


  /** Abandon any in-flight work and go back to a usable screen. */
  const cancelAnalysis = () => {
    runRef.current += 1;
    busyRef.current = false;
    setLoading(false);
    setPhase("idle");
    setPendingPreview(null);
  };

  /** Re-run the diagnosis with the customer's extra context merged in (intent wins). */
  const runFollowUp = async (extra: string) => {
    const text = extra.trim();
    if (!text || busyRef.current) return;
    const merged = [note, text].filter(Boolean).join(" ");
    const turns = turnCount + 1;
    busyRef.current = true;
    const token = ++runRef.current;
    setNote(merged);
    setTurnCount(turns);
    setAnalysis(null);
    setError(null);
    setLoading(true);
    await runDiagnosis(frames, merged, token, { latestMessage: text, turns });
  };

  /**
   * "Find a professional" / "Not sure" — stop clarifying and resolve with what
   * we already know, leaving the remaining detail to the pro.
   */
  const resolveNow = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    const token = ++runRef.current;
    setAnalysis(null);
    setError(null);
    setLoading(true);
    await runDiagnosis(frames, note, token, { latestMessage: note, forceResolve: true });
  };

  const reset = () => {
    runRef.current += 1;
    busyRef.current = false;
    setImage(null);
    setFrames([]);
    setMediaKind(null);
    setNote("");
    setAskedQuestions([]);
    setTurnCount(0);
    setTextOnly(false);
    setDescribeMode(false);
    setDescribeText("");
    setAnalysis(null);
    setError(null);
    setLoading(false);
    setPhase("idle");
    setPendingPreview(null);
    setConfirmPhoto(false);
  };


  // Clearing the input value lets the user pick the exact same file again.
  const onPick = (kind: "photo" | "video" | "upload") => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) void handleFile(file, kind);
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        {(image || analysis) && (
          <div className="sticky top-14 z-20 -mx-1 mb-1 flex items-center justify-between gap-2 bg-background/85 px-1 py-2 backdrop-blur md:top-16">
            <button
              type="button"
              onClick={reset}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-bold hover:bg-muted"
            >
              <ArrowRight className="h-4 w-4 rotate-180" /> Back
            </button>
            <Link
              to="/"
              className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-muted-foreground hover:text-primary"
            >
              Home
            </Link>
          </div>
        )}
        <div className="pt-2">

          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" /> One way to talk to GetPros
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">Don’t know what service you need? Show us.</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Take a photo, record a video, upload an image, or simply describe the outcome you want. GetPros works out
            what the job actually is and routes it to the right local professional. A photo is never required.
          </p>
        </div>

        {/* Hidden inputs stay mounted for every state so Retake works from
            the review, error and result screens too. */}
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={onPick("photo")}
        />
        <input
          ref={videoRef}
          type="file"
          accept="video/*"
          capture="environment"
          className="hidden"
          onChange={onPick("video")}
        />
        <input
          ref={uploadRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={onPick("upload")}
        />

        {!image && !analysis && (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <CaptureTile
              icon={Camera}
              label="Take a photo"
              hint="Use your camera"
              onClick={() => cameraRef.current?.click()}
            />
            <CaptureTile
              icon={Video}
              label="Record a video"
              hint="Show the issue"
              onClick={() => videoRef.current?.click()}
            />
            <CaptureTile
              icon={Upload}
              label="Upload from Gallery"
              hint="Choose an image"
              className="hidden sm:flex"
              onClick={() => uploadRef.current?.click()}
            />
            <CaptureTile
              icon={MessageCircle}
              label="Describe the job"
              hint="No photo needed"
              active={describeMode}
              onClick={() => setDescribeMode((v) => !v)}
            />
          </div>
        )}

        {/* Mobile: the photo library stays available, but as a quiet secondary
            action so the camera remains the primary way in. */}
        {!image && !analysis && (
          <button
            type="button"
            onClick={() => uploadRef.current?.click()}
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-border/60 bg-card/60 px-4 text-sm font-semibold text-muted-foreground hover:bg-muted sm:hidden"
          >
            <Upload className="h-4 w-4" /> Choose from photo library
          </button>
        )}

        {!image && !analysis && describeMode && (
          <div className="mb-24 mt-4 rounded-3xl border border-secondary/30 bg-card p-5 shadow-sm animate-fade-in md:mb-0">
            <label className="block text-sm font-bold">Tell us what you need</label>
            <p className="mt-1 text-xs text-muted-foreground">
              Plain language is perfect — e.g. “the seat on my sofa has sunk down and feels soft underneath”.
            </p>
            <textarea
              value={describeText}
              onChange={(e) => setDescribeText(e.target.value)}
              rows={4}
              placeholder="Describe the problem or the job you want done…"
              className="mt-3 w-full resize-none rounded-2xl border border-border/60 bg-background p-3 text-sm outline-none focus:border-secondary"
            />
            <GradientButton
              onClick={() => void runTextAnalysis()}
              disabled={describeText.trim().length < 4 || loading}
              className="mt-3 w-full justify-center"
            >
              <Sparkles className="h-4 w-4" /> Find the right service
            </GradientButton>
          </div>
        )}

        {!image && error && (
          <div className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            <p className="font-semibold">We couldn't finish that</p>
            <p className="mt-1 text-destructive/90">{error}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {describeText.trim().length >= 4 && (
                <button
                  type="button"
                  onClick={() => void runTextAnalysis()}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Retry request
                </button>
              )}
              <button
                onClick={() => cameraRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-bold text-foreground"
              >
                <Camera className="h-3.5 w-3.5" /> Retake photo
              </button>
              <button
                onClick={() => uploadRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-bold"
              >
                <Upload className="h-3.5 w-3.5" /> Choose another
              </button>
            </div>
          </div>
        )}

        {!image && <TrustBadges />}
        {!image && recent.length > 0 && <RecentDiagnoses entries={recent} />}

        {/* Mobile capture confirmation: check the shot, then continue. */}
        {confirmPhoto && image && !analysis && (
          <div className="mt-6 space-y-4 animate-fade-in">
            <div className="relative overflow-hidden surface-card">
              <img src={image} alt="Photo you just took" className="w-full max-h-[440px] object-contain bg-muted/30" />
              <div className="absolute top-3 left-3 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur">
                Photo
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Is the problem clearly visible? Use this photo to continue, or retake it.
            </p>
            <div className="grid gap-2">
              <GradientButton onClick={() => void acceptCapturedPhoto()} className="min-h-12 justify-center">
                <Check className="h-4 w-4" /> Use photo
              </GradientButton>
              <button
                type="button"
                onClick={() => cameraRef.current?.click()}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 text-sm font-bold hover:bg-muted"
              >
                <Camera className="h-4 w-4" /> Retake
              </button>
              <button
                type="button"
                onClick={() => uploadRef.current?.click()}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold text-muted-foreground hover:text-primary"
              >
                <Upload className="h-4 w-4" /> Choose from photo library
              </button>
            </div>
            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}
          </div>
        )}

        {!confirmPhoto && image && !analysis && (
          <div className="mt-6 space-y-4">
            <div className="relative overflow-hidden surface-card">
              <img src={image} alt="Captured problem" className="w-full max-h-[420px] object-contain bg-muted/30" />
              <div className="absolute top-3 left-3 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur">
                {mediaKind === "video" ? "Video frame" : mediaKind === "photo" ? "Photo" : "Uploaded"}
              </div>
              <button
                type="button"
                onClick={reset}
                aria-label="Remove this image"
                className="absolute top-2 right-2 grid h-11 w-11 place-items-center rounded-full bg-black/60 text-white backdrop-blur transition-colors hover:bg-black/80"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {/* Single image by design — Replace swaps the one image you're diagnosing. */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => cameraRef.current?.click()}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-card px-3 text-sm font-bold hover:bg-muted"
              >
                <Camera className="h-4 w-4" /> Retake
              </button>
              <button
                type="button"
                onClick={() => uploadRef.current?.click()}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-card px-3 text-sm font-bold hover:bg-muted"
              >
                <Upload className="h-4 w-4" /> Replace
              </button>
              <button
                type="button"
                onClick={reset}
                className="col-span-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-border bg-card px-3 text-sm font-bold text-muted-foreground hover:bg-muted sm:col-span-1"
              >
                <X className="h-4 w-4" /> Remove image
              </button>
            </div>
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground">Add a note (optional)</span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="e.g. Kitchen sink drips constantly, started yesterday…"
                className="mt-1 w-full resize-none surface-card p-3 text-sm outline-none focus:border-primary"
              />
            </label>
            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}
            <div className="flex gap-2">
              <GradientButton onClick={runAnalysis} disabled={loading} className="min-h-12 flex-1 justify-center">
                <Sparkles className="h-4 w-4" /> Diagnose with AI
              </GradientButton>
            </div>

          </div>
        )}

        {loading && (
          <ScanningOverlay
            image={image ?? pendingPreview}
            phase={phase}
            fast={fastPath}
            onCancel={cancelAnalysis}
          />
        )}

        {analysis && (image || textOnly) && (
          <AnalysisView
            analysis={analysis}
            image={image}
            onReset={reset}
            onAnswer={(t) => void runFollowUp(t)}
            onResolve={() => void resolveNow()}
            serviceLocation={incomingLoc}
          />

        )}
      </div>
    </AppShell>
  );
}

/** Three real stages, driven by the actual work — never by timers. */
const SCAN_STEPS = ["Understanding your request", "Finding the right service", "Preparing your match"];

function ScanningOverlay({
  image,
  phase,
  fast = false,
  onCancel,
}: {
  image: string | null;
  phase: "idle" | "preparing" | "analyzing" | "matching";
  fast?: boolean;
  onCancel: () => void;
}) {
  const stepIndex = phase === "preparing" ? 0 : phase === "matching" ? 2 : 1;
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    setSlow(false);
    // Only flag a genuine backend delay, never a staged animation.
    const slowTimer = setTimeout(() => setSlow(true), 4000);
    return () => clearTimeout(slowTimer);
  }, [phase]);



  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden animate-fade-in">
      {/* Ambient blurred image + gradient wash */}
      <div
        className="absolute inset-0 scale-110 bg-cover bg-center blur-2xl opacity-60"
        style={image ? { backgroundImage: `url(${image})` } : undefined}
      />

      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, oklch(0.215 0.070 266 / 0.90), oklch(0.320 0.110 250 / 0.80) 60%, oklch(0.215 0.070 266 / 0.94))" }} />
      {/* Floating orbs */}
      <div className="absolute -left-24 top-1/4 h-80 w-80 rounded-full bg-primary/30 blur-3xl animate-pulse" />
      <div className="absolute -right-24 bottom-1/4 h-96 w-96 rounded-full bg-secondary/25 blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />


      {/* Backdrop lets taps through (e.g. the bottom-nav camera for an instant
          re-capture); only this card — including Cancel — stays interactive. */}
      <div className="pointer-events-auto relative mx-4 w-full max-w-md rounded-2xl border border-white/15 bg-white/10 p-5 shadow-elevated backdrop-blur-2xl animate-scale-in sm:p-6">
        <div className="relative overflow-hidden rounded-2xl border border-white/20">
          {image ? (
            <img src={image} alt="Analyzing" className={fast ? "h-40 w-full object-cover" : "h-64 w-full object-cover"} />
          ) : (
            <div
              className={`grid w-full place-items-center ${fast ? "h-40" : "h-64"}`}
              style={{ background: "linear-gradient(150deg, oklch(0.245 0.075 264), oklch(0.330 0.095 232))" }}
            >
              <Loader2 className="h-8 w-8 animate-spin text-white/80" />
            </div>
          )}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-1.5 animate-[scanline_1.8s_ease-in-out_infinite]"
            style={{
              background: "linear-gradient(90deg, transparent, var(--secondary), var(--primary), transparent)",
              boxShadow: "0 0 32px color-mix(in oklab, var(--secondary) 80%, transparent)",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-secondary/10 via-transparent to-primary/30 mix-blend-overlay" />
          {/* Corner brackets */}
          <div className="absolute left-2 top-2 h-5 w-5 rounded-tl-md border-l-2 border-t-2 border-white/70" />
          <div className="absolute right-2 top-2 h-5 w-5 rounded-tr-md border-r-2 border-t-2 border-white/70" />
          <div className="absolute bottom-2 left-2 h-5 w-5 rounded-bl-md border-b-2 border-l-2 border-white/70" />
          <div className="absolute bottom-2 right-2 h-5 w-5 rounded-br-md border-b-2 border-r-2 border-white/70" />
          <div className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 text-[0.625rem] font-medium uppercase tracking-[0.18em] text-white/90 backdrop-blur">
            <ScanLine className="h-2.5 w-2.5" /> ✦ GetPros AI • Scanning
          </div>
        </div>
        <div className="mt-5">
          <div className="text-center">
            <div className="text-[1.0625rem] font-semibold leading-snug tracking-[-0.01em] text-white sm:text-lg">
              Analyzing your request
            </div>
          </div>
          {/* Indeterminate: real work, no fake percentage. */}
          <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full w-1/3 rounded-full animate-[scanbar_1.4s_ease-in-out_infinite]"
              style={{ background: "linear-gradient(90deg, transparent, var(--secondary), var(--primary), transparent)" }}
            />
          </div>

          <div className="mt-4 space-y-2">
            {SCAN_STEPS.map((s, i) => {
              const done = i < stepIndex;
              const active = i === stepIndex;
              return (
                <div
                  key={s}
                  className="flex items-center gap-2.5 text-sm text-white/90 transition-opacity"
                  style={{ opacity: done || active ? 1 : 0.45 }}
                >
                  {done ? (
                    <div className="grid h-4 w-4 place-items-center rounded-full bg-primary text-white">
                      <Check className="h-2.5 w-2.5" strokeWidth={4} />
                    </div>
                  ) : active ? (
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border border-white/40" />
                  )}
                  <span className={done ? "text-white/55" : ""}>{s}</span>
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={onCancel}
            data-testid="snap-cancel"
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
          >
            <X className="h-4 w-4" /> Cancel
          </button>
          {slow && (
            <p className="mt-2 text-center text-xs text-white/60">
              This is taking longer than usual — you can cancel any time.
            </p>
          )}
        </div>
        <style>{`@keyframes scanline{0%{transform:translateY(0)}50%{transform:translateY(${fast ? 148 : 216}px)}100%{transform:translateY(0)}}@keyframes scanbar{0%{transform:translateX(-110%)}100%{transform:translateX(320%)}}`}</style>
      </div>
    </div>
  );
}

function CaptureTile({
  icon: Icon,
  label,
  hint,
  onClick,
  active = false,
  className = "",
}: {
  icon: typeof Camera;
  label: string;
  hint: string;
  onClick: () => void;
  active?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`card-lift group flex flex-col items-center justify-center gap-3 rounded-3xl border bg-card p-6 text-center shadow-sm hover:-translate-y-0.5 hover:shadow-elevated ${
        active ? "border-secondary ring-2 ring-secondary/30" : "border-border/60 hover:border-secondary/40"
      } ${className}`}
    >
      <div
        className="grid h-14 w-14 place-items-center rounded-2xl text-white shadow-card"
        style={{ background: "var(--primary)" }}
      >
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <div className="text-sm font-bold">{label}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
    </button>
  );
}



function JobScopeCta({ analysis, image }: { analysis: SnapAnalysis; image: string | null }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const go = async () => {
    if (!user) {
      await navigate({ to: "/login", search: { redirect: "/snap" } });
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const job = await createJobFromAnalysis({ customerId: user.id, analysis, imageDataUrl: image });
      await navigate({ to: "/job/$id", params: { id: job.id } });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "We couldn't create the job scope. Please try again.");
      setBusy(false);
    }
  };

  return (
    <div className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/5 to-card p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {["Snap", "Understand", "Scope", "Compare", "Book", "Verify", "Proof"].map((s, i) => (
          <span key={s} className="inline-flex items-center gap-2">
            <span className={i <= 1 ? "text-primary" : ""}>{s}</span>
            {i < 6 && <span className="text-border">→</span>}
          </span>
        ))}
      </div>
      <h3 className="mt-3 text-lg font-black">Turn this into a standardized job scope</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        We package the diagnosis into one clear scope — problem, work required, urgency, time and expected price — so every pro
        quotes on exactly the same thing. You can edit it before requesting quotes.
      </p>
      <GradientButton onClick={go} disabled={busy} className="mt-4 w-full justify-center py-4 text-base">
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ClipboardList className="h-5 w-5" />}
        {user ? "Create job scope & compare quotes" : "Continue — sign in to confirm"}
      </GradientButton>
      {err && <p className="mt-2 text-xs text-destructive">{err}</p>}
    </div>
  );
}

function AnalysisView({
  analysis,
  image,
  onReset,
  onAnswer,
  onResolve,
  serviceLocation,
}: {
  analysis: SnapAnalysis;
  image: string | null;
  onReset: () => void;
  onAnswer?: (text: string) => void;
  onResolve?: () => void;
  /** Free text the customer gave for where the job is, e.g. "Frisco, TX 75034". */
  serviceLocation?: string;
}) {
  const navigate = useNavigate();
  const u = urgencyStyles[analysis.urgency] ?? urgencyStyles.medium;
  const UrgencyIcon = u.icon;
  const category = getCategoryBySlug(analysis.categorySlug);
  const showPricing = analysis.hasPriceEstimate;
  // Once the service is known we always progress to professionals — a missing
  // price estimate must never block the customer from reaching someone.
  const showPros = analysis.responseKind === "diagnosis" && Boolean(analysis.categorySlug);
  const sourceLabel: Record<string, string> = {
    detected: "Detected issue",
    possible: "Possible issue",
    "customer-described": "Customer-described issue",
    insufficient: "Need more information",
  };
  const duration = analysis.estimatedDurationMinutes ?? 60;
  const durationLabel =
    duration >= 60 ? `${(duration / 60).toFixed(duration % 60 === 0 ? 0 : 1)} hr` : `${duration} min`;
  const confidencePct = Math.round((analysis.confidence ?? 0.7) * 100);

  // Real, verified, currently-bookable GetPros pros for this exact trade near the
  // service ZIP. No samples, no filler from other trades: if nobody qualifies
  // the customer is told so honestly.
  const [matched, setMatched] = useState<ProviderMatch[]>([]);
  const [prosLoading, setProsLoading] = useState(false);
  const locText = (serviceLocation ?? "").trim();

  useEffect(() => {
    if (!showPros || !analysis.categorySlug) { setMatched([]); return; }
    let cancelled = false;
    setProsLoading(true);
    const zip = isZipCode(locText) ? locText : extractZip(locText);
    void (async () => {
      const place = zip ? await lookupZip(zip) : null;
      const list = await fetchBookableProviders(analysis.categorySlug, place).catch(() => []);
      if (!cancelled) { setMatched(list.slice(0, 5)); setProsLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [showPros, analysis.categorySlug, locText]);

  const recommended = matched[0];
  const others = matched.slice(1);
  const hasZip = Boolean(isZipCode(locText) || extractZip(locText));

  // Save to history exactly once per analysis
  const savedRef = useRef(false);
  useEffect(() => {
    if (savedRef.current) return;
    savedRef.current = true;
    try {
      saveHistoryEntry({ thumbnail: image ?? "", analysis });
    } catch {
      /* ignore */
    }
  }, [analysis, image]);

  const [quoteMode, setQuoteMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [sent, setSent] = useState(false);
  const [messagingId, setMessagingId] = useState<string | null>(null);
  const [callingId, setCallingId] = useState<string | null>(null);

  const toggleSelect = (id: string) => {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= 5 ? s : [...s, id]));
  };

  const sendQuoteRequests = () => {
    if (selected.length === 0) return;
    setSent(true);
    setTimeout(() => {
      setSent(false);
      setQuoteMode(false);
      setSelected([]);
    }, 2400);
  };

  return (
    <div className="mt-6 space-y-5 animate-fade-in">
      <div className={`grid gap-4 ${image ? "md:grid-cols-[240px_1fr]" : ""}`}>
        {image && (
          <div className="overflow-hidden surface-card">
            <img src={image} alt="Diagnosed" className="h-full max-h-[240px] w-full object-cover" />
          </div>
        )}
        <div className="surface-card p-5">
          <div className="flex flex-wrap items-center gap-2">
            {category && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br ${category.gradient} px-3 py-1 text-xs font-semibold text-white`}
              >
                <category.icon className="h-3.5 w-3.5" /> {analysis.category}
              </span>
            )}
            {showPricing && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${u.chip}`}
              >
                <UrgencyIcon className="h-3.5 w-3.5" /> {u.label}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
              {sourceLabel[analysis.issueSource] ?? "Possible issue"}
            </span>
            {image && analysis.visualSubject && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">
                Focused on: {analysis.visualSubject}
              </span>
            )}
            <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
              <HistoryIcon className="h-3 w-3" /> Saved to history
            </span>
          </div>
          <div className="mt-3">
            <h2 className="text-lg font-black leading-snug">{analysis.headline}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{analysis.problem}</p>
          </div>
          {analysis.safetyNote && (
            <div className="mt-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              {analysis.safetyNote}
            </div>
          )}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-muted-foreground">AI confidence</span>
              <span className="font-bold text-primary">{confidencePct}%</span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-[width] duration-700"
                style={{ width: `${confidencePct}%`, background: "var(--primary)" }}
              />
            </div>
          </div>
        </div>
      </div>

      {showPricing && (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          icon={DollarSign}
          label="Estimated cost"
          value={`$${analysis.estimatedCostLow}–$${analysis.estimatedCostHigh}`}
          hint="Typical range in your area"
        />
        <Stat icon={Timer} label="Repair time" value={durationLabel} hint="Estimated on-site" />
        <Stat icon={UrgencyIcon} label="Urgency" value={u.label} hint={analysis.urgencyReason} />
        {matched.length > 0 && (
          <Stat
            icon={Clock}
            label="Pros available"
            value={String(matched.length)}
            hint={
              recommended?.distanceMiles != null
                ? `Closest is ${Math.round(recommended.distanceMiles)} mi away`
                : "Verified and accepting work"
            }
          />
        )}
      </div>
      )}

      {(analysis.clarifyingQuestions?.length ?? 0) > 0 && (
        <ClarifyPanel questions={analysis.clarifyingQuestions!} onAnswer={onAnswer} onResolve={onResolve} />
      )}

      {(analysis.serviceOptions?.length ?? 0) > 0 && (
        <div className="rounded-3xl border border-secondary/30 bg-card p-5 shadow-sm">
          <div className="text-sm font-black">What do you want help with?</div>
          <p className="mt-1 text-xs text-muted-foreground">More than one service could fit. Pick the closest match.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {analysis.serviceOptions!.map((opt) => (
              <button
                key={opt.label}
                onClick={() => onAnswer?.(`I want help with: ${opt.label}. ${opt.reason ?? ""}`)}
                className="rounded-2xl border border-border/60 bg-background p-3 text-left transition-all hover:-translate-y-0.5 hover:border-secondary hover:shadow-card"
              >
                <div className="text-sm font-bold">{opt.label}</div>
                {opt.reason && <div className="mt-0.5 text-xs text-muted-foreground">{opt.reason}</div>}
              </button>
            ))}
          </div>
        </div>
      )}

      {analysis.recommendedActions?.length > 0 && (
        <div className="surface-card p-5">
          <div className="text-sm font-bold">While you wait</div>
          <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
            {analysis.recommendedActions.map((a) => (
              <li key={a} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" /> {a}
              </li>
            ))}
          </ul>
        </div>
      )}

      {((analysis.possibleCauses?.length ?? 0) > 0 || (analysis.nextSteps?.length ?? 0) > 0) && (
        <div className="grid gap-3 md:grid-cols-2">
          {(analysis.possibleCauses?.length ?? 0) > 0 && (
            <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-primary/5 to-card p-5 shadow-sm">
              <div className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                <Sparkles className="h-3.5 w-3.5" /> Possible causes
              </div>
              <ol className="space-y-2 text-sm">
                {analysis.possibleCauses!.map((c, i) => (
                  <li key={c} className="flex gap-2.5">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-black text-primary">
                      {i + 1}
                    </span>
                    <span className="text-foreground/90">{c}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          {(analysis.nextSteps?.length ?? 0) > 0 && (
            <div className="surface-card p-5">
              <div className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                <ArrowRight className="h-3.5 w-3.5" /> Suggested next steps
              </div>
              <ul className="space-y-2 text-sm">
                {analysis.nextSteps!.map((s) => (
                  <li key={s} className="flex gap-2.5">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="text-foreground/90">{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {showPros && (
      <>
      {/* Confirmed service summary — editable before we go looking for a pro */}
      <div className="rounded-3xl border border-primary/25 bg-card p-5 shadow-sm">
        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Service we'll request</div>
        <div className="mt-1 text-base font-black">
          {analysis.category || category?.name || "Service"}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{analysis.problem}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {category && (
            <Link
              to="/services/$category"
              params={{ category: category.slug }}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-2 text-xs font-semibold hover:bg-muted"
            >
              Change service
            </Link>
          )}
          <button
            onClick={onReset}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-2 text-xs font-semibold hover:bg-muted"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Start over
          </button>
        </div>
      </div>


      {prosLoading ? (
        <div className="flex items-center gap-2 rounded-3xl border border-border/60 bg-muted/40 p-5 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Looking for verified {analysis.category || "service"} pros
          {hasZip ? " near your service address" : ""}…
        </div>
      ) : matched.length > 0 ? (
        <GradientButton
          onClick={() => document.getElementById("pros-list")?.scrollIntoView({ behavior: "smooth", block: "start" })}
          className="w-full justify-center py-4 text-base"
        >
          <ShieldCheck className="h-5 w-5" /> Browse {matched.length} available {matched.length === 1 ? "pro" : "pros"}
        </GradientButton>
      ) : (
        <div className="rounded-3xl border border-border/60 bg-muted/40 p-5 text-sm">
          <div className="font-black">
            No verified pros in your area yet — join early access and we'll notify you when pros launch near you.
          </div>
          <p className="mt-1 text-muted-foreground">
            {hasZip
              ? "We only show real, verified GetPros professionals — never a sample profile."
              : "Add your ZIP code and we'll check which verified pros actually cover it."}
          </p>
          <div className="-mt-6">
            <EarlyAccessSection />
          </div>
        </div>
      )}

      {matched.length > 0 && (
      <div id="pros-list" className="scroll-mt-20">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-black">Pros who can take this job</h2>
            <p className="text-xs text-muted-foreground">
              Verified GetPros professionals accepting work in this trade{hasZip ? " and covering your ZIP" : ""}.
            </p>
          </div>
        </div>

        <div className="grid gap-3">
          {recommended && (
            <ProCard
              match={recommended}
              recommended
              onBook={() =>
                navigate({
                  to: "/book",
                  search: {
                    provider: recommended.provider.user_id,
                    ...(analysis.categorySlug ? { category: analysis.categorySlug } : {}),
                  },
                })
              }
            />
          )}
          <div className="grid gap-3 md:grid-cols-2">
            {others.map((m) => (
              <ProCard
                key={m.provider.user_id}
                match={m}
                onBook={() =>
                  navigate({
                    to: "/book",
                    search: {
                      provider: m.provider.user_id,
                      ...(analysis.categorySlug ? { category: analysis.categorySlug } : {}),
                    },
                  })
                }
              />
            ))}
          </div>
        </div>
      </div>
      )}

      {/* Sign-in is only asked for here, after the customer has seen the result and pros. */}
      {matched.length > 0 && <JobScopeCta analysis={analysis} image={image} />}


      </>
      )}

      <div className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-muted-foreground">
          {showPricing
            ? "Estimates are AI-generated — the final price is confirmed by your pro after inspection."
            : "No price shown yet — GetPros avoids guessing a price until we understand the job."}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/history"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold hover:bg-muted"
          >
            <HistoryIcon className="h-3.5 w-3.5" /> View history
          </Link>
          <button
            onClick={onReset}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold hover:bg-muted"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Snap another
          </button>
          <Link
            to="/emergency"
            className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
          >
            <ShieldAlert className="h-3.5 w-3.5" /> Emergency help
          </Link>
        </div>
      </div>

    </div>
  );
}

function ClarifyPanel({
  questions,
  onAnswer,
  onResolve,
}: {
  questions: string[];
  onAnswer?: (text: string) => void;
  onResolve?: () => void;
}) {
  const [answer, setAnswer] = useState("");
  return (
    <div className="rounded-3xl border border-secondary/30 bg-card p-5 shadow-sm">
      <div className="inline-flex items-center gap-1.5 text-sm font-black">
        <Sparkles className="h-4 w-4 text-secondary" /> One quick thing
      </div>
      <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
        {questions.map((q) => (
          <li key={q} className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-secondary" /> {q}
          </li>
        ))}
      </ul>
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        rows={3}
        placeholder="Answer here — or skip and let the pro sort out the details…"
        className="mt-3 w-full resize-none rounded-2xl border border-border/60 bg-background p-3 text-sm outline-none focus:border-secondary"
      />
      <GradientButton
        onClick={() => onAnswer?.(answer.trim())}
        disabled={answer.trim().length < 2}
        className="mt-3 w-full justify-center"
      >
        <ArrowRight className="h-4 w-4" /> Continue
      </GradientButton>
      {onResolve && (
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <button
            onClick={onResolve}
            className="w-full rounded-full border border-primary/40 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary hover:bg-primary/10"
          >
            Find a professional
          </button>
          <button
            onClick={onResolve}
            className="w-full rounded-full border border-border bg-background px-4 py-3 text-sm font-semibold hover:bg-muted"
          >
            Not sure — decide with the pro
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * A real GetPros professional. Everything shown here comes from the pro's own
 * public profile — we never invent ratings, ETAs or distances.
 */
function ProCard({
  match,
  recommended = false,
  onBook,
}: {
  match: ProviderMatch;
  recommended?: boolean;
  onBook: () => void;
}) {
  const p = match.provider;
  const name = p.business_name?.trim() || "GetPros professional";
  const initials = name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "GP";
  return (
    <div
      className={`relative overflow-hidden rounded-3xl border bg-card p-4 shadow-sm transition-all ${
        recommended ? "border-primary/30 shadow-elevated md:p-5" : "border-border/60 hover:shadow-card"
      }`}
    >
      {recommended && (
        <div className="absolute inset-x-0 top-0 h-1" style={{ background: "var(--gradient-primary)" }} />
      )}
      {recommended && (
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-primary">
          <CheckCircle2 className="h-3 w-3" /> Closest available pro
        </div>
      )}

      <div className="flex items-center gap-3">
        <Avatar initials={initials} gradient="var(--gradient-primary)" size={recommended ? 60 : 48} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="truncate text-sm font-black">{name}</div>
            <span className="inline-flex items-center gap-0.5 rounded-full bg-mint/25 px-1.5 py-0.5 text-xs font-bold uppercase tracking-wider text-mint-ink">
              <ShieldCheck className="h-2.5 w-2.5" /> Verified
            </span>
          </div>
          {p.service_category && (
            <div className="truncate text-xs text-muted-foreground">{p.service_category}</div>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
            {match.distanceMiles != null && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {Math.round(match.distanceMiles)} mi away
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" /> {p.default_duration_minutes} min typical visit
            </span>
          </div>
        </div>
        {p.starting_price != null && (
          <div className="text-xs font-bold text-foreground">
            from <span className="text-primary">${Number(p.starting_price)}</span>
          </div>
        )}
      </div>

      {p.bio && <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{p.bio}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        <GradientButton onClick={onBook} className="flex-1 justify-center py-2.5 text-sm">
          <CalendarClock className="h-4 w-4" /> Request this pro
        </GradientButton>
        <Link
          to="/provider/$id"
          params={{ id: p.user_id }}
          className="inline-flex items-center justify-center rounded-full border border-border bg-background px-4 py-2.5 text-sm font-semibold hover:bg-muted"
        >
          View profile
        </Link>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Camera;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="surface-card p-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-primary" /> {label}
      </div>
      <div className="mt-2 text-lg font-black">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground line-clamp-2">{hint}</div>}
    </div>
  );
}

// Placeholder so ArrowRight import isn't unused when adjusting the layout later.
void ArrowRight;

function TrustBadges() {
  const items = [
    { icon: Sparkles, label: "AI Powered Diagnosis" },
    { icon: BadgeCheck, label: "Verification when reviewed" },
    { icon: Tag, label: "Upfront Pricing" },
    { icon: Lock, label: "Private & Secure" },
    { icon: HandHeart, label: "Before & After Proof" },
  ];
  return (
    <div className="mt-6 rounded-3xl border border-border/60 bg-gradient-to-br from-primary/5 via-card to-card p-4 backdrop-blur-xl">
      <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        <Users className="h-3.5 w-3.5 text-primary" /> AI-powered matching
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {items.map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-2 rounded-2xl border border-border/40 bg-background/60 p-3 text-center transition-transform hover:-translate-y-0.5"
          >
            <div
              className="grid h-9 w-9 place-items-center rounded-xl text-white shadow-sm"
              style={{ background: "var(--primary)" }}
            >
              <Icon className="h-4 w-4" />
            </div>
            <div className="text-xs font-semibold leading-tight">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecentDiagnoses({ entries }: { entries: SnapHistoryEntry[] }) {
  return (
    <div className="mt-6 animate-fade-in">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-black">Recent AI Diagnoses</h2>
          <p className="text-xs text-muted-foreground">Your latest scans, saved on this device.</p>
        </div>
        <Link
          to="/history"
          className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
        >
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {entries.map((entry) => {
          const cat = getCategoryBySlug(entry.analysis.categorySlug);
          const u = urgencyStyles[entry.analysis.urgency] ?? urgencyStyles.medium;
          return (
            <Link
              key={entry.id}
              to="/history"
              className="group flex items-center gap-3 surface-card p-3 transition-all hover:-translate-y-0.5 hover:shadow-card"
            >
              <div className="relative shrink-0">
                {entry.thumbnail ? (
                  <img src={entry.thumbnail} alt="" className="h-14 w-14 rounded-xl object-cover" />
                ) : (
                  <div className="grid h-14 w-14 place-items-center rounded-xl bg-muted text-muted-foreground"><MessageCircle className="h-5 w-5" /></div>
                )}
                {cat && (
                  <div
                    className={`absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br ${cat.gradient} text-white shadow ring-2 ring-card`}
                  >
                    <cat.icon className="h-3 w-3" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="line-clamp-1 text-sm font-semibold">{entry.analysis.problem}</div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground/80">
                    {entry.analysis.hasPriceEstimate
                      ? `$${entry.analysis.estimatedCostLow}–$${entry.analysis.estimatedCostHigh}`
                      : "No estimate yet"}
                  </span>
                  <span>·</span>
                  <span>{formatRelative(entry.createdAt)}</span>
                </div>
              </div>
              <span
                className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${u.chip}`}
              >
                {u.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}