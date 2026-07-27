import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
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
} from "lucide-react";
import { AppShell, Avatar, GradientButton } from "@/components/snapit/AppShell";
import { analyzeSnap, type SnapAnalysis } from "@/lib/snap-analyze.functions";
import { providers, categories } from "@/lib/snapit-data";

export const Route = createFileRoute("/snap")({
  head: () => ({
    meta: [
      { title: "Snap a problem — AI diagnosis in seconds | SnapIt" },
      { name: "description", content: "Snap a photo or video of any home or personal service problem. SnapIt's AI diagnoses it and finds nearby verified pros in seconds." },
      { property: "og:title", content: "Snap a Problem — AI diagnosis | SnapIt" },
      { property: "og:description", content: "Point your camera. Get an instant diagnosis, estimate and matched pros." },
    ],
  }),
  component: SnapPage,
});

const urgencyStyles: Record<string, { chip: string; label: string; icon: typeof ShieldAlert }> = {
  emergency: { chip: "bg-red-100 text-red-700 border-red-200", label: "Emergency", icon: ShieldAlert },
  high: { chip: "bg-orange-100 text-orange-700 border-orange-200", label: "High priority", icon: Zap },
  medium: { chip: "bg-amber-100 text-amber-700 border-amber-200", label: "This week", icon: Clock },
  low: { chip: "bg-emerald-100 text-emerald-700 border-emerald-200", label: "Whenever", icon: Clock },
};

function SnapPage() {
  const [image, setImage] = useState<string | null>(null);
  const [mediaKind, setMediaKind] = useState<"photo" | "video" | "upload" | null>(null);
  const [note, setNote] = useState("");
  const [analysis, setAnalysis] = useState<SnapAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const analyze = useServerFn(analyzeSnap);
  const cameraRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File, kind: "photo" | "video" | "upload") => {
    setError(null);
    setAnalysis(null);
    // For videos, capture a thumbnail frame; for images use directly
    if (file.type.startsWith("video/")) {
      const dataUrl = await extractVideoFrame(file);
      setImage(dataUrl);
    } else {
      const dataUrl = await fileToDataUrl(file);
      setImage(dataUrl);
    }
    setMediaKind(kind);
  };

  const runAnalysis = async () => {
    if (!image) return;
    setLoading(true);
    setError(null);
    try {
      const result = await analyze({ data: { imageDataUrl: image, note } });
      setAnalysis(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setImage(null);
    setMediaKind(null);
    setNote("");
    setAnalysis(null);
    setError(null);
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
            Show us what's going on. Our AI identifies the service, estimates the cost and matches you with vetted pros nearby.
          </p>
        </div>

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
              label="Upload from device"
              hint="Image or video"
              onClick={() => uploadRef.current?.click()}
            />
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0], "photo")}
            />
            <input
              ref={videoRef}
              type="file"
              accept="video/*"
              capture="environment"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0], "video")}
            />
            <input
              ref={uploadRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0], "upload")}
            />
          </div>
        )}

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
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Analyzing with AI…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" /> Diagnose with AI
                  </>
                )}
              </GradientButton>
            </div>
          </div>
        )}

        {analysis && image && (
          <AnalysisView analysis={analysis} image={image} onReset={reset} />
        )}
      </div>
    </AppShell>
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

function AnalysisView({ analysis, image, onReset }: { analysis: SnapAnalysis; image: string; onReset: () => void }) {
  const navigate = useNavigate();
  const u = urgencyStyles[analysis.urgency] ?? urgencyStyles.medium;
  const UrgencyIcon = u.icon;
  const category = categories.find((c) => c.slug === analysis.categorySlug);
  const matched = providers
    .filter((p) => p.category === analysis.categorySlug)
    .concat(providers.filter((p) => p.category !== analysis.categorySlug))
    .slice(0, 4)
    .map((p, i) => ({ ...p, eta: [8, 14, 22, 35][i] ?? 40 }));
  const confidencePct = Math.round((analysis.confidence ?? 0.7) * 100);

  return (
    <div className="mt-6 space-y-5">
      <div className="grid gap-4 md:grid-cols-[220px_1fr]">
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
          <img src={image} alt="Diagnosed" className="h-full max-h-[220px] w-full object-cover" />
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            {category && (
              <span className={`inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br ${category.color} px-3 py-1 text-xs font-semibold text-white`}>
                <category.icon className="h-3.5 w-3.5" /> {analysis.category}
              </span>
            )}
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${u.chip}`}>
              <UrgencyIcon className="h-3.5 w-3.5" /> {u.label}
            </span>
          </div>
          <p className="mt-3 text-sm text-foreground">{analysis.problem}</p>
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-muted-foreground">AI confidence</span>
              <span className="font-bold text-primary">{confidencePct}%</span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full" style={{ width: `${confidencePct}%`, background: "var(--gradient-primary)" }} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          icon={DollarSign}
          label="Estimated cost"
          value={`$${analysis.estimatedCostLow}–$${analysis.estimatedCostHigh}`}
          hint="Typical range in your area"
        />
        <Stat
          icon={UrgencyIcon}
          label="Suggested urgency"
          value={u.label}
          hint={analysis.urgencyReason}
        />
        <Stat
          icon={Clock}
          label="Fastest arrival"
          value={`~${matched[0]?.eta ?? 10} min`}
          hint={`${matched.length} verified pros nearby`}
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

      <div>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-lg font-black">Nearby verified professionals</h2>
          <span className="text-xs text-muted-foreground">Sorted by ETA</span>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {matched.map((p) => (
            <div key={p.id} className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <Avatar initials={p.initials} gradient={p.gradient} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <div className="truncate text-sm font-bold">{p.name}</div>
                    {p.verified && <ShieldCheck className="h-3.5 w-3.5 text-primary" />}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{p.business}</div>
                </div>
                <div className="text-right">
                  <div className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                    <Clock className="h-3 w-3" /> {p.eta} min
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1 font-semibold">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {p.rating}
                  <span className="ml-1 font-normal text-muted-foreground">· {p.reviews} reviews</span>
                </span>
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-3 w-3" /> {p.distance} mi
                </span>
              </div>
              <div className="mt-3 flex gap-2">
                <Link to="/provider/$id" params={{ id: p.id }} className="flex-1 rounded-full border border-border py-2 text-center text-xs font-semibold hover:bg-muted">
                  View profile
                </Link>
                <button
                  onClick={() => navigate({ to: "/tracking/$id", params: { id: p.id } })}
                  className="flex-1 rounded-full py-2 text-center text-xs font-semibold text-white shadow-sm"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  Book & track
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-muted-foreground">
          Diagnosis is an estimate — the final price is confirmed by your pro after inspection.
        </div>
        <div className="flex gap-2">
          <button onClick={onReset} className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold hover:bg-muted">
            <RotateCcw className="h-3.5 w-3.5" /> Snap another
          </button>
          <Link to="/emergency" className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700">
            <ShieldAlert className="h-3.5 w-3.5" /> Emergency help
          </Link>
        </div>
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
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-primary" /> {label}
      </div>
      <div className="mt-2 text-lg font-black">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground line-clamp-2">{hint}</div>}
    </div>
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function extractVideoFrame(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.src = url;
    video.onloadeddata = () => {
      video.currentTime = Math.min(1, video.duration / 2);
    };
    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas unavailable"));
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    video.onerror = () => reject(new Error("Could not read video"));
  });
}

// Placeholder so ArrowRight import isn't unused when adjusting the layout later.
void ArrowRight;