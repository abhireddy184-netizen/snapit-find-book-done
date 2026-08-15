import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Camera, Sparkles, Wrench, ShieldCheck, ArrowRight, Video, Upload, MessageCircle,
  Tv, PaintRoller, Blinds, Sofa, SprayCan, Lightbulb, Scissors, Zap, Leaf, Car, Hammer, Droplet,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Hero journey rail: problem -> understand -> exact service -> proof  */
/* ------------------------------------------------------------------ */

const JOURNEY = [
  { icon: Camera, label: "Show it", detail: "Photo, video or a few words", tint: "var(--primary)" },
  { icon: Sparkles, label: "GPB understands", detail: "Likely issue, urgency, cost range", tint: "var(--secondary)" },
  { icon: Wrench, label: "Exact service", detail: "One clear scope, matched pros", tint: "var(--lavender)" },
  { icon: ShieldCheck, label: "Fixed, with proof", detail: "Before & after kept for you", tint: "var(--coral)" },
];

export function JourneyRail({ onColor = false, stacked = false }: { onColor?: boolean; stacked?: boolean }) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setActive((a) => (a + 1) % JOURNEY.length), 2600);
    return () => clearInterval(t);
  }, []);

  return (
    <ol className={stacked ? "relative grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1" : "relative grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4"}>
      {JOURNEY.map((s, i) => {
        const on = i === active;
        return (
          <li
            key={s.label}
            className={
              "relative flex items-start gap-3 overflow-hidden rounded-2xl border p-3.5 transition-all duration-500 " +
              (on
                ? "-translate-y-0.5 border-transparent shadow-lg"
                : onColor
                  ? "border-white/15 bg-white/5"
                  : "border-border/60 bg-card/70")
            }
            style={on ? { background: "color-mix(in oklab, " + s.tint + " 12%, var(--card))", borderColor: "color-mix(in oklab, " + s.tint + " 40%, transparent)" } : undefined}
          >
            <span
              className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white shadow-md transition-transform duration-500"
              style={{ background: s.tint, transform: on ? "scale(1.06)" : "scale(1)" }}
            >
              {on && <span className="ping-ring absolute inset-0 rounded-xl" style={{ background: s.tint, opacity: 0.35 }} />}
              <s.icon className="relative h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
            </span>
            <span className="min-w-0">
              <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">Step {i + 1}</span>
              <span className="block text-sm font-black leading-tight text-foreground">{s.label}</span>
              <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{s.detail}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/* ------------------------------------------------------------------ */
/* Input mode chips                                                    */
/* ------------------------------------------------------------------ */

export function InputModes() {
  const modes = [
    { icon: Camera, label: "Take a photo" },
    { icon: Video, label: "Record a video" },
    { icon: Upload, label: "Upload an image" },
    { icon: MessageCircle, label: "Just describe it" },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {modes.map((m) => (
        <Link
          key={m.label}
          to="/snap"
          className="group inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/80 px-3.5 py-2 text-xs font-bold text-foreground shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
        >
          <m.icon className="h-3.5 w-3.5 text-primary transition-transform group-hover:scale-110" />
          {m.label}
        </Link>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* One photo, many services — interactive room canvas                  */
/* ------------------------------------------------------------------ */

type Spot = {
  id: string;
  name: string;
  service: string;
  blurb: string;
  category: string;
  icon: typeof Tv;
  x: number;
  y: number;
  tint: string;
};

const SPOTS: Spot[] = [
  { id: "tv", name: "Blank wall", service: "TV mounting", blurb: "Bracket fitted, cables concealed, level checked.", category: "mounting-installation", icon: Tv, x: 30, y: 26, tint: "var(--secondary)" },
  { id: "paint", name: "Scuffed wall", service: "Interior painting", blurb: "Patch, prime and repaint the accent wall.", category: "painting", icon: PaintRoller, x: 68, y: 18, tint: "var(--primary)" },
  { id: "curtain", name: "Bare window", service: "Curtain & blind fitting", blurb: "Rails, rods and coverings installed straight.", category: "doors-windows", icon: Blinds, x: 82, y: 40, tint: "var(--lavender)" },
  { id: "sofa", name: "Flat-pack pile", service: "Furniture assembly", blurb: "Built, placed and packaging taken away.", category: "furniture", icon: Sofa, x: 24, y: 66, tint: "var(--coral)" },
  { id: "clean", name: "Dusty floor", service: "Deep cleaning", blurb: "Full room reset — floors, skirting, surfaces.", category: "cleaning", icon: SprayCan, x: 52, y: 80, tint: "var(--mint-ink)" },
  { id: "light", name: "Dead ceiling light", service: "Light & fixture fitting", blurb: "Fixture swapped and tested by a qualified pro.", category: "electrical", icon: Lightbulb, x: 50, y: 10, tint: "var(--sky-ink)" },
];

export function RoomStory() {
  const [activeId, setActiveId] = useState<string>("tv");
  const [auto, setAuto] = useState(true);
  const active = useMemo(() => SPOTS.find((s) => s.id === activeId)!, [activeId]);

  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => {
      setActiveId((cur) => {
        const i = SPOTS.findIndex((s) => s.id === cur);
        return SPOTS[(i + 1) % SPOTS.length]!.id;
      });
    }, 3000);
    return () => clearInterval(t);
  }, [auto]);

  const pick = (id: string) => { setAuto(false); setActiveId(id); };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
      {/* Canvas */}
      <div className="relative overflow-hidden rounded-[26px] border border-border/60 bg-card shadow-[var(--shadow-elevated)]">
        <div className="relative aspect-[4/3] w-full overflow-hidden">
          {/* Room illustration, drawn in CSS */}
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, color-mix(in oklab, var(--primary) 7%, var(--card)) 0%, color-mix(in oklab, var(--secondary) 8%, var(--card)) 68%, color-mix(in oklab, var(--foreground) 8%, var(--card)) 68.5%, color-mix(in oklab, var(--foreground) 12%, var(--card)) 100%)" }} />
          {/* window */}
          <div className="absolute right-[10%] top-[26%] h-[26%] w-[20%] rounded-lg border-2 border-border/70 bg-[color-mix(in_oklab,var(--sky)_45%,white)] shadow-inner" />
          <div className="absolute right-[19.6%] top-[26%] h-[26%] w-[0.6%] bg-border/70" />
          {/* wall panel */}
          <div className="absolute left-[18%] top-[16%] h-[26%] w-[26%] rounded-xl border border-dashed border-border/70 bg-[color-mix(in_oklab,var(--foreground)_4%,transparent)]" />
          {/* sofa */}
          <div className="absolute bottom-[10%] left-[12%] h-[16%] w-[28%] rounded-2xl bg-[color-mix(in_oklab,var(--coral)_35%,var(--card))] shadow-md" />
          <div className="absolute bottom-[20%] left-[13%] h-[8%] w-[26%] rounded-t-2xl bg-[color-mix(in_oklab,var(--coral)_50%,var(--card))]" />
          {/* rug */}
          <div className="absolute bottom-[6%] left-[42%] h-[10%] w-[34%] rounded-[50%] bg-[color-mix(in_oklab,var(--lavender)_28%,var(--card))]" />
          {/* plant */}
          <div className="absolute bottom-[10%] right-[8%] h-[18%] w-[8%] rounded-t-full bg-[color-mix(in_oklab,var(--mint)_60%,var(--card))]" />
          {/* pendant light */}
          <div className="absolute left-1/2 top-0 h-[10%] w-px -translate-x-1/2 bg-border" />
          <div className="absolute left-1/2 top-[9%] h-[4%] w-[8%] -translate-x-1/2 rounded-b-full bg-[color-mix(in_oklab,var(--foreground)_25%,var(--card))]" />

          {/* AI scan sweep */}
          <div className="scan-sweep" />

          {/* Hotspots */}
          {SPOTS.map((s) => {
            const on = s.id === activeId;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => pick(s.id)}
                aria-label={`${s.service} opportunity`}
                aria-pressed={on}
                className="absolute -translate-x-1/2 -translate-y-1/2 outline-none"
                style={{ left: `${s.x}%`, top: `${s.y}%` }}
              >
                <span className="relative grid place-items-center">
                  {on && <span className="ping-ring absolute h-7 w-7 rounded-full" style={{ background: s.tint }} />}
                  <span
                    className="relative grid place-items-center rounded-full text-white shadow-lg ring-2 ring-white/80 transition-all duration-300"
                    style={{ background: s.tint, height: on ? 34 : 26, width: on ? 34 : 26 }}
                  >
                    <s.icon style={{ height: on ? 16 : 13, width: on ? 16 : 13 }} />
                  </span>
                </span>
              </button>
            );
          })}

          {/* Floating readout */}
          <div className="pointer-events-none absolute inset-x-3 bottom-3">
            <div className="glass-strong flex items-center gap-3 rounded-2xl px-3.5 py-2.5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-white shadow" style={{ background: active.tint }}>
                <active.icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">Detected · {active.name}</span>
                <span className="block truncate text-sm font-black text-foreground">{active.service}</span>
              </span>
              <span className="ml-auto hidden shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-black text-primary sm:inline-flex">
                <Sparkles className="h-3 w-3" /> GPB AI
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Side list */}
      <div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          GPB reads the whole scene, not just one object. One photo can surface every service that space may need —
          then <span className="font-semibold text-foreground">what you actually ask for</span> decides the exact job we scope and quote.
        </p>
        <ul className="mt-4 space-y-2">
          {SPOTS.map((s) => {
            const on = s.id === activeId;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => pick(s.id)}
                  className={
                    "flex w-full items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-left transition-all duration-300 " +
                    (on ? "border-transparent shadow-md" : "border-border/60 bg-card hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-sm")
                  }
                  style={on ? { background: "color-mix(in oklab, " + s.tint + " 12%, var(--card))", borderColor: "color-mix(in oklab, " + s.tint + " 38%, transparent)" } : undefined}
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-white shadow-sm" style={{ background: s.tint }}>
                    <s.icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-foreground">{s.service}</span>
                    <span className="block truncate text-xs text-muted-foreground">{s.blurb}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <Link
          to="/services/$category"
          params={{ category: active.category }}
          className="mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white shadow-lg transition-transform hover:scale-[1.02]"
          style={{ background: "var(--gradient-primary)" }}
        >
          Explore {active.service} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pro verticals strip                                                 */
/* ------------------------------------------------------------------ */

const VERTICALS = [
  { name: "Beauty at Home", who: "Stylists, nail & lash techs", slug: "beauty-at-home", icon: Scissors, tint: "var(--primary)" },
  { name: "Electrical", who: "Qualified electricians", slug: "electrical", icon: Zap, tint: "var(--sky-ink)" },
  { name: "Home Cleaning", who: "Vetted cleaning teams", slug: "cleaning", icon: SprayCan, tint: "var(--mint-ink)" },
  { name: "Lawn & Outdoor", who: "Grounds & garden crews", slug: "lawn-outdoor", icon: Leaf, tint: "var(--success)" },
  { name: "Handyman", who: "Multi-trade fixers", slug: "handyman", icon: Hammer, tint: "var(--lavender)" },
  { name: "Auto & Mobile", who: "They come to your driveway", slug: "auto-mobile", icon: Car, tint: "var(--secondary)" },
  { name: "Plumbing", who: "Leaks, drains, water heaters", slug: "plumbing", icon: Droplet, tint: "var(--sky-ink)" },
];

export function ProVerticals() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {VERTICALS.map((v) => (
        <Link
          key={v.slug}
          to="/services/$category"
          params={{ category: v.slug }}
          className="group relative overflow-hidden rounded-3xl border border-border/60 bg-card p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl"
        >
          <span
            className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-15 blur-2xl transition-opacity group-hover:opacity-35"
            style={{ background: v.tint }}
          />
          <span className="relative grid h-11 w-11 place-items-center rounded-2xl text-white shadow-md transition-transform group-hover:scale-110" style={{ background: v.tint }}>
            <v.icon className="h-5 w-5" />
          </span>
          <span className="relative mt-3 block text-sm font-black text-foreground">{v.name}</span>
          <span className="relative mt-0.5 block text-xs text-muted-foreground">{v.who}</span>
        </Link>
      ))}
    </div>
  );
}

/** Vertical hairline that visually links one section to the next. */
export function SectionConnector({ label }: { label?: string }) {
  return (
    <div className="relative flex flex-col items-center py-8" aria-hidden="true">
      <span className="hairline-connector h-16 w-px" />
      {label && (
        <span className="mt-3 rounded-full border border-border/60 bg-card/80 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground backdrop-blur">
          {label}
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Compact section bridge — short label + hairline cue                */
/* ------------------------------------------------------------------ */

export function SectionBridge({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-3" aria-hidden="true">
      <span className="h-px w-12 sm:w-20 bg-gradient-to-r from-transparent via-primary/40 to-primary/10 animate-pulse" />
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground backdrop-blur shadow-sm">
        <span className="h-1.5 w-1.5 rounded-full bg-primary/70 animate-pulse" />
        {label}
      </span>
      <span className="h-px w-12 sm:w-20 bg-gradient-to-l from-transparent via-primary/40 to-primary/10 animate-pulse" />
    </div>
  );
}

