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
} from "lucide-react";
import { AppShell, Avatar, GradientButton } from "@/components/snapit/AppShell";
import { analyzeSnap, type SnapAnalysis } from "@/lib/snap-analyze.functions";
import { providers, categories, type Provider } from "@/lib/snapit-data";
import { saveHistoryEntry, loadHistory, formatRelative, type SnapHistoryEntry } from "@/lib/snap-history";
import { useAuth } from "@/lib/auth";
import { createJobFromAnalysis } from "@/lib/jobs";
import { prepareMediaForAnalysis, withTimeout } from "@/lib/snap-media";
import {
  BadgeCheck,
  Lock,
  HandHeart,
  Tag,
  Users,
} from "lucide-react";

/** Hard ceiling for a single AI diagnosis request before we bail out. */
const ANALYSIS_TIMEOUT_MS = 40_000;

export const Route = createFileRoute("/snap")({
  head: () => ({
    meta: [
      { title: "Snap a problem — AI diagnosis in seconds | GPB" },
      { name: "description", content: "Snap a photo or video of any problem. GPB's AI explains what it likely needs, builds a standardized job scope and helps you compare quotes from service pros." },
      { property: "og:title", content: "Snap a Problem — AI diagnosis | GPB" },
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
  const [image, setImage] = useState<string | null>(null);
  const [mediaKind, setMediaKind] = useState<"photo" | "video" | "upload" | null>(null);
  const [note, setNote] = useState("");
  const [describeMode, setDescribeMode] = useState(false);
  const [describeText, setDescribeText] = useState("");
  const [textOnly, setTextOnly] = useState(false);
  const [analysis, setAnalysis] = useState<SnapAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "preparing" | "analyzing">("idle");
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const analyze = useServerFn(analyzeSnap);
  const cameraRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  // Monotonic token: only the newest run is allowed to write state.
  const runRef = useRef(0);
  const busyRef = useRef(false);
  const [recent, setRecent] = useState<SnapHistoryEntry[]>([]);
  useEffect(() => {
    setRecent(loadHistory().slice(0, 4));
  }, [analysis]);
  useEffect(() => () => {
    // Invalidate any in-flight run when the page unmounts.
    runRef.current += 1;
  }, []);
  // Release the temporary preview blob URL whenever it's replaced or cleared.
  useEffect(() => {
    if (!pendingPreview) return;
    return () => URL.revokeObjectURL(pendingPreview);
  }, [pendingPreview]);

  const runDiagnosis = async (dataUrl: string | null, noteText: string, token: number) => {
    setPhase("analyzing");
    try {
      const result = await withTimeout(
        analyze({ data: dataUrl ? { imageDataUrl: dataUrl, note: noteText } : { note: noteText } }),
        ANALYSIS_TIMEOUT_MS,
        "The AI is taking longer than usual. Please retry or retake the photo.",
      );
      if (runRef.current !== token) return;
      setAnalysis(result);
    } catch (e) {
      if (runRef.current !== token) return;
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
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
    setTextOnly(false);
    setDescribeMode(false);
    setMediaKind(kind);
    setNote("");
    // Show the working state immediately — no dead period after capture.
    setLoading(true);
    setPhase("preparing");
    setPendingPreview(file.type.startsWith("video/") ? null : URL.createObjectURL(file));

    let dataUrl: string;
    try {
      dataUrl = await prepareMediaForAnalysis(file);
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
    setImage(dataUrl);
    await runDiagnosis(dataUrl, "", token);
  };

  const runAnalysis = async () => {
    if (!image || busyRef.current) return;
    busyRef.current = true;
    const token = ++runRef.current;
    setLoading(true);
    setError(null);
    await runDiagnosis(image, note, token);
  };

  /** Text-only path — no photo required (essential on desktop). */
  const runTextAnalysis = async () => {
    const described = describeText.trim();
    if (described.length < 4 || busyRef.current) return;
    busyRef.current = true;
    const token = ++runRef.current;
    setError(null);
    setAnalysis(null);
    setImage(null);
    setMediaKind(null);
    setTextOnly(true);
    setNote(described);
    setLoading(true);
    await runDiagnosis(null, described, token);
  };

  /** Abandon any in-flight work and go back to a usable screen. */
  const cancelAnalysis = () => {
    runRef.current += 1;
    busyRef.current = false;
    setLoading(false);
    setPhase("idle");
    setPendingPreview(null);
  };

  const reset = () => {
    runRef.current += 1;
    busyRef.current = false;
    setImage(null);
    setMediaKind(null);
    setNote("");
    setTextOnly(false);
    setDescribeMode(false);
    setDescribeText("");
    setAnalysis(null);
    setError(null);
    setLoading(false);
    setPhase("idle");
    setPendingPreview(null);
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
        <div className="pt-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" /> AI-powered diagnosis
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">Snap a Problem</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Show us what's going on. Our AI identifies the service, estimates the cost and builds a standardized job scope and matches you with pros nearby.
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

        {!image && (
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
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
              onClick={() => uploadRef.current?.click()}
            />
          </div>
        )}

        {!image && error && (
          <div className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            <p className="font-semibold">We couldn't finish that</p>
            <p className="mt-1 text-destructive/90">{error}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => cameraRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
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

        {image && !analysis && (
          <div className="mt-6 space-y-4">
            <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm">
              <img src={image} alt="Captured problem" className="w-full max-h-[420px] object-contain bg-muted/30" />
              <div className="absolute top-3 left-3 rounded-full bg-black/60 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur">
                {mediaKind === "video" ? "Video frame" : mediaKind === "photo" ? "Photo" : "Uploaded"}
              </div>
            </div>
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground">Add a note (optional)</span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="e.g. Kitchen sink drips constantly, started yesterday…"
                className="mt-1 w-full resize-none rounded-2xl border border-border/60 bg-card p-3 text-sm outline-none focus:border-primary"
              />
            </label>
            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}
            <div className="flex gap-2">
              <button
                onClick={reset}
                className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-3 text-sm font-semibold hover:bg-muted"
              >
                <RotateCcw className="h-4 w-4" /> Retake
              </button>
              <GradientButton onClick={runAnalysis} disabled={loading} className="flex-1 justify-center">
                <Sparkles className="h-4 w-4" /> Diagnose with AI
              </GradientButton>
            </div>
          </div>
        )}

        {loading && (
          <ScanningOverlay
            image={image ?? pendingPreview}
            phase={phase}
            onCancel={cancelAnalysis}
          />
        )}

        {analysis && image && (
          <AnalysisView analysis={analysis} image={image} onReset={reset} />
        )}
      </div>
    </AppShell>
  );
}

function ScanningOverlay({
  image,
  phase,
  onCancel,
}: {
  image: string | null;
  phase: "idle" | "preparing" | "analyzing";
  onCancel: () => void;
}) {
  const steps = [
    "Preparing your photo…",
    "AI is analyzing the problem…",
    "Identifying the service…",
    "Estimating repair cost…",
    "Finding nearby professionals…",
  ];
  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress] = useState(6);
  useEffect(() => {
    if (phase === "preparing") return;
    const stepTimer = setInterval(() => {
      setStepIndex((i) => (i < steps.length - 1 ? i + 1 : i));
    }, 1200);
    const progressTimer = setInterval(() => {
      setProgress((p) => (p < 94 ? p + Math.max(1, Math.round((96 - p) * 0.08)) : p));
    }, 180);
    return () => {
      clearInterval(stepTimer);
      clearInterval(progressTimer);
    };
  }, [steps.length, phase]);
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden animate-fade-in">
      {/* Ambient blurred image + gradient wash */}
      <div
        className="absolute inset-0 scale-110 bg-cover bg-center blur-2xl opacity-60"
        style={image ? { backgroundImage: `url(${image})` } : undefined}
      />
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, oklch(0.274 0.084 322 / 0.88), oklch(0.45 0.19 350 / 0.78) 60%, oklch(0.274 0.084 322 / 0.92))" }} />
      {/* Floating orbs */}
      <div className="absolute -left-24 top-1/4 h-80 w-80 rounded-full bg-primary/30 blur-3xl animate-pulse" />
      <div className="absolute -right-24 bottom-1/4 h-96 w-96 rounded-full bg-fuchsia-500/20 blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />

      <div className="relative mx-4 w-full max-w-md rounded-[28px] border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur-2xl animate-scale-in">
        <div className="relative overflow-hidden rounded-2xl border border-white/20">
          {image ? (
            <img src={image} alt="Analyzing" className="h-64 w-full object-cover" />
          ) : (
            <div className="grid h-64 w-full place-items-center bg-plum/40">
              <Loader2 className="h-8 w-8 animate-spin text-white/80" />
            </div>
          )}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 animate-[scanline_1.8s_ease-in-out_infinite]" style={{ background: "var(--gradient-primary)", boxShadow: "0 0 32px color-mix(in oklab, var(--primary) 85%, transparent)" }} />
          <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-primary/30 mix-blend-overlay" />
          {/* Corner brackets */}
          <div className="absolute left-2 top-2 h-5 w-5 border-l-2 border-t-2 border-white/70 rounded-tl-md" />
          <div className="absolute right-2 top-2 h-5 w-5 border-r-2 border-t-2 border-white/70 rounded-tr-md" />
          <div className="absolute left-2 bottom-2 h-5 w-5 border-l-2 border-b-2 border-white/70 rounded-bl-md" />
          <div className="absolute right-2 bottom-2 h-5 w-5 border-r-2 border-b-2 border-white/70 rounded-br-md" />
          <div className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur">
            <ScanLine className="h-3 w-3 animate-pulse" /> AI scanning
          </div>
          <div className="absolute bottom-3 right-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-black text-primary shadow">
            {progress}%
          </div>
        </div>
        <div className="mt-5">
          <div className="text-center">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white/80">
              <Sparkles className="h-3.5 w-3.5" /> GPB AI
            </div>
            <div className="mt-1 text-lg font-black text-white">
              {phase === "preparing" ? "Preparing your photo" : "Diagnosing your problem"}
            </div>
          </div>
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full transition-[width] duration-200 ease-out"
              style={{ width: `${progress}%`, background: "var(--gradient-primary)" }}
            />
          </div>
          <div className="mt-4 space-y-2">
            {steps.map((s, i) => {
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
                  <span className={done ? "text-white/50 line-through" : ""}>{s}</span>
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={onCancel}
            data-testid="snap-cancel"
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20"
          >
            <X className="h-4 w-4" /> Cancel
          </button>
          <p className="mt-2 text-center text-[11px] text-white/60">
            This usually takes a few seconds. You can cancel any time.
          </p>
        </div>
        <style>{`@keyframes scanline{0%{transform:translateY(0)}50%{transform:translateY(216px)}100%{transform:translateY(0)}}`}</style>
      </div>
    </div>
  );
}

function CaptureTile({
  icon: Icon,
  label,
  hint,
  onClick,
}: {
  icon: typeof Camera;
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center justify-center gap-3 rounded-3xl border border-border/60 bg-card p-6 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
    >
      <div
        className="grid h-14 w-14 place-items-center rounded-2xl text-white shadow-md"
        style={{ background: "var(--gradient-primary)" }}
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

type MatchedProvider = Provider & { eta: number };

function JobScopeCta({ analysis, image }: { analysis: SnapAnalysis; image: string }) {
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
      <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
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
        {user ? "Create job scope & compare quotes" : "Sign in to create your job scope"}
      </GradientButton>
      {err && <p className="mt-2 text-xs text-destructive">{err}</p>}
    </div>
  );
}

function AnalysisView({ analysis, image, onReset }: { analysis: SnapAnalysis; image: string; onReset: () => void }) {
  const navigate = useNavigate();
  const u = urgencyStyles[analysis.urgency] ?? urgencyStyles.medium;
  const UrgencyIcon = u.icon;
  const category = categories.find((c) => c.slug === analysis.categorySlug);
  const duration = analysis.estimatedDurationMinutes ?? 60;
  const durationLabel =
    duration >= 60 ? `${(duration / 60).toFixed(duration % 60 === 0 ? 0 : 1)} hr` : `${duration} min`;
  const confidencePct = Math.round((analysis.confidence ?? 0.7) * 100);

  const matched: MatchedProvider[] = useMemo(() => {
    const inCat = providers.filter((p) => p.category === analysis.categorySlug);
    const others = providers.filter((p) => p.category !== analysis.categorySlug);
    const merged = [...inCat, ...others];
    // Sort in-category first by rating desc then distance asc, then top up with adjacent pros
    const sorted = merged
      .slice()
      .sort((a, b) => {
        const catA = a.category === analysis.categorySlug ? 0 : 1;
        const catB = b.category === analysis.categorySlug ? 0 : 1;
        if (catA !== catB) return catA - catB;
        if (b.rating !== a.rating) return b.rating - a.rating;
        return a.distance - b.distance;
      })
      .slice(0, 5);
    return sorted.map((p, i) => ({ ...p, eta: [7, 12, 18, 26, 34][i] ?? 40 }));
  }, [analysis.categorySlug]);

  const recommended = matched[0];
  const others = matched.slice(1);

  // Save to history exactly once per analysis
  const savedRef = useRef(false);
  useEffect(() => {
    if (savedRef.current) return;
    savedRef.current = true;
    try {
      saveHistoryEntry({ thumbnail: image, analysis });
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
      <div className="grid gap-4 md:grid-cols-[240px_1fr]">
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
          <img src={image} alt="Diagnosed" className="h-full max-h-[240px] w-full object-cover" />
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            {category && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br ${category.color} px-3 py-1 text-xs font-semibold text-white`}
              >
                <category.icon className="h-3.5 w-3.5" /> {analysis.category}
              </span>
            )}
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${u.chip}`}
            >
              <UrgencyIcon className="h-3.5 w-3.5" /> {u.label}
            </span>
            <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
              <HistoryIcon className="h-3 w-3" /> Saved to history
            </span>
          </div>
          <div className="mt-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Detected problem</div>
            <p className="mt-1 text-sm text-foreground">{analysis.problem}</p>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-muted-foreground">AI confidence</span>
              <span className="font-bold text-primary">{confidencePct}%</span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-[width] duration-700"
                style={{ width: `${confidencePct}%`, background: "var(--gradient-primary)" }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          icon={DollarSign}
          label="Estimated cost"
          value={`$${analysis.estimatedCostLow}–$${analysis.estimatedCostHigh}`}
          hint="Typical range in your area"
        />
        <Stat icon={Timer} label="Repair time" value={durationLabel} hint="Estimated on-site" />
        <Stat icon={UrgencyIcon} label="Urgency" value={u.label} hint={analysis.urgencyReason} />
        <Stat
          icon={Clock}
          label="Fastest ETA"
          value={`~${recommended?.eta ?? 10} min`}
          hint={`${matched.length} pros nearby`}
        />
      </div>

      {analysis.recommendedActions?.length > 0 && (
        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
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
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/10 text-[10px] font-black text-primary">
                      {i + 1}
                    </span>
                    <span className="text-foreground/90">{c}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          {(analysis.nextSteps?.length ?? 0) > 0 && (
            <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
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

      {/* Pros section header + quote toolbar */}
      <JobScopeCta analysis={analysis} image={image} />

      <GradientButton
        onClick={() => document.getElementById("pros-list")?.scrollIntoView({ behavior: "smooth", block: "start" })}
        className="w-full justify-center py-4 text-base"
      >
        <ShieldCheck className="h-5 w-5" /> Browse service pros
      </GradientButton>

      <div id="pros-list" className="scroll-mt-20">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-black">Service pros nearby</h2>
            <p className="text-xs text-muted-foreground">Demo data — sample profiles shown while real pros are onboarded.</p>
          </div>
          <button
            onClick={() => {
              setQuoteMode((v) => !v);
              setSelected([]);
            }}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${
              quoteMode ? "border-primary bg-primary/10 text-primary" : "border-border text-foreground hover:bg-muted"
            }`}
          >
            {quoteMode ? (
              <>
                <X className="h-3.5 w-3.5" /> Cancel
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" /> Request quotes
              </>
            )}
          </button>
        </div>

        {quoteMode && (
          <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 text-xs animate-fade-in">
            <div className="flex items-center gap-2 font-semibold text-primary">
              <Sparkles className="h-4 w-4" /> Select up to 5 pros to request quotes
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-primary/10 px-2 py-1 font-bold text-primary">
                {selected.length}/5
              </span>
              <GradientButton
                onClick={sendQuoteRequests}
                disabled={selected.length === 0 || sent}
                className="px-4 py-2 text-xs"
              >
                {sent ? (
                  <>
                    <Check className="h-3.5 w-3.5" /> Sent!
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" /> Send ({selected.length})
                  </>
                )}
              </GradientButton>
            </div>
          </div>
        )}

        <div className="grid gap-3">
          {recommended && (
            <ProCard
              pro={recommended}
              recommended
              quoteMode={quoteMode}
              selected={selected.includes(recommended.id)}
              onToggle={() => toggleSelect(recommended.id)}
              onBook={() => navigate({ to: "/book", search: { provider: recommended.id } })}
              onMessage={() => setMessagingId(recommended.id)}
              onCall={() => setCallingId(recommended.id)}
            />
          )}
          <div className="grid gap-3 md:grid-cols-2">
            {others.map((p) => (
              <ProCard
                key={p.id}
                pro={p}
                quoteMode={quoteMode}
                selected={selected.includes(p.id)}
                onToggle={() => toggleSelect(p.id)}
                onBook={() => navigate({ to: "/book", search: { provider: p.id } })}
                onMessage={() => setMessagingId(p.id)}
                onCall={() => setCallingId(p.id)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-muted-foreground">
          Diagnosis is an estimate — the final price is confirmed by your pro after inspection.
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

      {messagingId && (
        <MessageProSheet
          pro={matched.find((p) => p.id === messagingId)!}
          problem={analysis.problem}
          onClose={() => setMessagingId(null)}
        />
      )}
      {callingId && (
        <CallProSheet
          pro={matched.find((p) => p.id === callingId)!}
          onClose={() => setCallingId(null)}
        />
      )}
    </div>
  );
}

function ProCard({
  pro,
  recommended = false,
  quoteMode,
  selected,
  onToggle,
  onBook,
  onMessage,
  onCall,
}: {
  pro: MatchedProvider;
  recommended?: boolean;
  quoteMode: boolean;
  selected: boolean;
  onToggle: () => void;
  onBook: () => void;
  onMessage: () => void;
  onCall: () => void;
}) {
  const clickable = quoteMode;
  return (
    <div
      onClick={clickable ? onToggle : undefined}
      className={`relative overflow-hidden rounded-3xl border bg-card p-4 shadow-sm transition-all ${
        recommended ? "border-primary/30 shadow-lg md:p-5" : "border-border/60 hover:shadow-md"
      } ${clickable ? "cursor-pointer hover:-translate-y-0.5" : ""} ${
        selected ? "ring-2 ring-primary/60" : ""
      }`}
    >
      {recommended && (
        <div className="absolute inset-x-0 top-0 h-1" style={{ background: "var(--gradient-primary)" }} />
      )}
      {recommended && (
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
          <CheckCircle2 className="h-3 w-3" /> Recommended for you
        </div>
      )}
      {quoteMode && (
        <div
          className={`absolute right-3 top-3 grid h-6 w-6 place-items-center rounded-full border-2 transition-all ${
            selected ? "border-primary bg-primary text-white" : "border-border bg-background"
          }`}
        >
          {selected && <Check className="h-3.5 w-3.5" strokeWidth={4} />}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Avatar initials={pro.initials} gradient={pro.gradient} size={recommended ? 60 : 48} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <div className="truncate text-sm font-black">{pro.name}</div>
            {pro.verified && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-mint/25 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-mint-ink">
                <ShieldCheck className="h-2.5 w-2.5" /> Verified
              </span>
            )}
          </div>
          <div className="truncate text-[11px] text-muted-foreground">{pro.business}</div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px]">
            <span className="inline-flex items-center gap-1 font-semibold">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {pro.rating}
              <span className="ml-1 font-normal text-muted-foreground">· {pro.reviews}</span>
            </span>
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <MapPin className="h-3 w-3" /> {pro.distance} mi
            </span>
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Award className="h-3 w-3" /> {pro.yearsExperience}y
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
            <Clock className="h-3 w-3" /> {pro.eta} min
          </div>
          <div className="text-[11px] font-bold text-foreground">
            from <span className="text-primary">${pro.startingPrice}</span>
          </div>
        </div>
      </div>

      {!quoteMode && (
        <div className="mt-4 grid grid-cols-[1fr_auto_auto] gap-2">
          <button
            onClick={onBook}
            className="inline-flex items-center justify-center gap-1.5 rounded-full py-2.5 text-xs font-bold text-white shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: "var(--gradient-primary)" }}
          >
            Book Now <ArrowRight className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onMessage}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground hover:bg-muted"
            aria-label="Message pro"
          >
            <MessageCircle className="h-4 w-4" />
          </button>
          <button
            onClick={onCall}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground hover:bg-muted"
            aria-label="Call pro"
          >
            <Phone className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function Sheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center">
      <div
        onClick={onClose}
        className="absolute inset-0 animate-fade-in"
        aria-hidden="true"
      />
      <div
        role="dialog"
        className="relative w-full max-w-md rounded-t-3xl border border-border/60 bg-background p-5 shadow-2xl animate-scale-in sm:rounded-3xl"
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-muted"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
        {children}
      </div>
    </div>
  );
}

function MessageProSheet({ pro, problem, onClose }: { pro: MatchedProvider; problem: string; onClose: () => void }) {
  const [text, setText] = useState(`Hi ${pro.name.split(" ")[0]}, I just used GPB AI. Here's what it flagged: "${problem}". Are you available to help?`);
  const [sent, setSent] = useState(false);
  return (
    <Sheet onClose={onClose}>
      <div className="flex items-center gap-3">
        <Avatar initials={pro.initials} gradient={pro.gradient} size={48} />
        <div>
          <div className="text-sm font-black">Message {pro.name.split(" ")[0]}</div>
          <div className="text-[11px] text-muted-foreground">Typically replies in a few minutes</div>
        </div>
      </div>
      {sent ? (
        <div className="mt-6 flex flex-col items-center justify-center gap-2 py-4">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
            <Check className="h-7 w-7" strokeWidth={3} />
          </div>
          <div className="text-sm font-bold">Message sent</div>
          <div className="text-xs text-muted-foreground">You'll get a notification when {pro.name.split(" ")[0]} replies.</div>
        </div>
      ) : (
        <>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            className="mt-4 w-full resize-none rounded-2xl border border-border/60 bg-card p-3 text-sm outline-none focus:border-primary"
          />
          <GradientButton
            onClick={() => setSent(true)}
            disabled={!text.trim()}
            className="mt-3 w-full justify-center py-2.5 text-sm"
          >
            <Send className="h-4 w-4" /> Send message
          </GradientButton>
        </>
      )}
    </Sheet>
  );
}

function CallProSheet({ pro, onClose }: { pro: MatchedProvider; onClose: () => void }) {
  return (
    <Sheet onClose={onClose}>
      <div className="flex flex-col items-center py-3 text-center">
        <div className="relative">
          <Avatar initials={pro.initials} gradient={pro.gradient} size={88} />
          <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-primary/20" />
        </div>
        <div className="mt-4 text-lg font-black">{pro.name}</div>
        <div className="text-xs text-muted-foreground">{pro.business}</div>
        <div className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Phone className="h-3 w-3" /> {pro.phone}
        </div>
        <div className="mt-6 flex w-full gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-full border border-border py-3 text-sm font-semibold hover:bg-muted"
          >
            Cancel
          </button>
          <a
            href={`tel:${pro.phone.replace(/[^+\d]/g, "")}`}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-full py-3 text-sm font-bold text-white shadow"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Phone className="h-4 w-4" /> Call now
          </a>
        </div>
      </div>
    </Sheet>
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
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
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
      <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
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
              style={{ background: "var(--gradient-primary)" }}
            >
              <Icon className="h-4 w-4" />
            </div>
            <div className="text-[11px] font-semibold leading-tight">{label}</div>
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
          className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-[11px] font-semibold hover:bg-muted"
        >
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {entries.map((entry) => {
          const cat = categories.find((c) => c.slug === entry.analysis.categorySlug);
          const u = urgencyStyles[entry.analysis.urgency] ?? urgencyStyles.medium;
          return (
            <Link
              key={entry.id}
              to="/history"
              className="group flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="relative shrink-0">
                <img src={entry.thumbnail} alt="" className="h-14 w-14 rounded-xl object-cover" />
                {cat && (
                  <div
                    className={`absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br ${cat.color} text-white shadow ring-2 ring-card`}
                  >
                    <cat.icon className="h-3 w-3" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="line-clamp-1 text-sm font-semibold">{entry.analysis.problem}</div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                  <span className="font-semibold text-foreground/80">
                    ${entry.analysis.estimatedCostLow}–${entry.analysis.estimatedCostHigh}
                  </span>
                  <span>·</span>
                  <span>{formatRelative(entry.createdAt)}</span>
                </div>
              </div>
              <span
                className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${u.chip}`}
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