import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PhoneCall, MessageCircle, ShieldCheck, Star, MapPin, Navigation, CheckCircle2, Clock } from "lucide-react";
import { AppShell, Avatar } from "@/components/snapit/AppShell";
import { providers } from "@/lib/snapit-data";

export const Route = createFileRoute("/tracking/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Tracking ${params.id} — SnapIt` },
      { name: "description", content: "Track your SnapIt pro in real time — see their ETA, route and arrival status." },
      { property: "og:title", content: "Live pro tracking — SnapIt" },
      { property: "og:description", content: "Real-time ETA and route updates for your booked pro." },
    ],
  }),
  loader: ({ params }) => {
    const provider = providers.find((p) => p.id === params.id);
    if (!provider) throw notFound();
    return { provider };
  },
  component: TrackingPage,
});

const stages = [
  { key: "confirmed", label: "Booking confirmed" },
  { key: "assigned", label: "Pro assigned" },
  { key: "enroute", label: "On the way" },
  { key: "arriving", label: "Arriving soon" },
  { key: "arrived", label: "Arrived" },
];

function TrackingPage() {
  const { provider } = Route.useLoaderData() as { provider: (typeof providers)[number] };
  const [progress, setProgress] = useState(0.05);
  const [stageIdx, setStageIdx] = useState(2);
  const [eta, setEta] = useState(12);

  useEffect(() => {
    const id = setInterval(() => {
      setProgress((p) => Math.min(1, p + 0.02));
      setEta((e) => Math.max(1, e - 1));
    }, 3000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (progress > 0.85) setStageIdx(4);
    else if (progress > 0.65) setStageIdx(3);
    else setStageIdx(2);
  }, [progress]);

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Live tracking</div>
            <h1 className="text-2xl font-black md:text-3xl">Your pro is on the way</h1>
          </div>
          <div className="rounded-full bg-primary/10 px-4 py-2 text-center">
            <div className="text-[10px] font-semibold uppercase text-primary">ETA</div>
            <div className="text-lg font-black text-primary">{eta} min</div>
          </div>
        </div>

        <MapPreview progress={progress} providerInitials={provider.initials} gradient={provider.gradient} />

        <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <Avatar initials={provider.initials} gradient={provider.gradient} size={56} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <div className="truncate text-base font-bold">{provider.name}</div>
                {provider.verified && <ShieldCheck className="h-4 w-4 text-primary" />}
              </div>
              <div className="truncate text-xs text-muted-foreground">{provider.business}</div>
              <div className="mt-1 inline-flex items-center gap-1 text-xs font-semibold">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {provider.rating}
                <span className="ml-1 font-normal text-muted-foreground">· {provider.reviews} jobs</span>
              </div>
            </div>
            <div className="flex gap-2">
              <a href="tel:+15550100199" className="grid h-11 w-11 place-items-center rounded-full border border-border hover:bg-muted">
                <PhoneCall className="h-4 w-4" />
              </a>
              <button className="grid h-11 w-11 place-items-center rounded-full text-white shadow-sm" style={{ background: "var(--gradient-primary)" }}>
                <MessageCircle className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
          <div className="text-sm font-bold">Trip progress</div>
          <ol className="mt-4 space-y-3">
            {stages.map((s, i) => {
              const done = i <= stageIdx;
              const current = i === stageIdx;
              return (
                <li key={s.key} className="flex items-center gap-3">
                  <span
                    className={`grid h-7 w-7 place-items-center rounded-full text-[10px] font-bold ${done ? "text-white" : "bg-muted text-muted-foreground"}`}
                    style={done ? { background: "var(--gradient-primary)" } : undefined}
                  >
                    {done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                  </span>
                  <span className={`text-sm ${current ? "font-bold text-foreground" : done ? "text-foreground" : "text-muted-foreground"}`}>
                    {s.label}
                  </span>
                  {current && (
                    <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                      <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" /><span className="relative inline-flex h-2 w-2 rounded-full bg-primary" /></span>
                      Now
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-2xl border border-border/60 bg-card p-3">
            <MapPin className="mx-auto h-4 w-4 text-primary" />
            <div className="mt-1 font-bold">{provider.distance} mi</div>
            <div className="text-muted-foreground">Distance</div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card p-3">
            <Clock className="mx-auto h-4 w-4 text-primary" />
            <div className="mt-1 font-bold">{eta} min</div>
            <div className="text-muted-foreground">Arrival</div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card p-3">
            <Navigation className="mx-auto h-4 w-4 text-primary" />
            <div className="mt-1 font-bold">{Math.round(progress * 100)}%</div>
            <div className="text-muted-foreground">Route</div>
          </div>
        </div>

        <div className="flex justify-between text-xs">
          <Link to="/dashboard" className="font-semibold text-primary hover:underline">← Back to bookings</Link>
          <button className="rounded-full border border-border px-3 py-1.5 font-semibold hover:bg-muted">Cancel booking</button>
        </div>
      </div>
    </AppShell>
  );
}

function MapPreview({ progress, providerInitials, gradient }: { progress: number; providerInitials: string; gradient: string }) {
  return (
    <div className="relative h-64 overflow-hidden rounded-3xl border border-border/60 shadow-lg md:h-80">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.15),transparent_40%),radial-gradient(circle_at_80%_60%,rgba(168,85,247,0.12),transparent_45%)] bg-slate-50" />
      {/* Grid lines to suggest map */}
      <svg className="absolute inset-0 h-full w-full opacity-40" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgb(148 163 184 / 0.35)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
      {/* Route path */}
      <svg viewBox="0 0 400 240" className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id="route" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
        <path
          d="M 40 200 C 120 160, 160 80, 240 100 S 340 60, 360 40"
          fill="none"
          stroke="url(#route)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="6 8"
        />
      </svg>
      {/* Destination pin */}
      <div className="absolute right-6 top-4 flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-foreground shadow-md">
        <MapPin className="h-3.5 w-3.5 text-red-500" /> Your address
      </div>
      {/* Origin */}
      <div className="absolute bottom-4 left-4 flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-foreground shadow-md">
        <span className="h-2 w-2 rounded-full bg-mint" /> Pro origin
      </div>
      {/* Moving avatar */}
      <div
        className="absolute transition-all duration-1000 ease-linear"
        style={{
          left: `calc(${10 + progress * 80}% - 22px)`,
          top: `calc(${80 - progress * 65}% - 22px)`,
        }}
      >
        <div className="relative">
          <span className="absolute inset-0 -m-2 animate-ping rounded-full bg-primary/40" />
          <div className={`relative grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br ${gradient} text-sm font-bold text-white shadow-xl ring-4 ring-white`}>
            {providerInitials}
          </div>
        </div>
      </div>
    </div>
  );
}