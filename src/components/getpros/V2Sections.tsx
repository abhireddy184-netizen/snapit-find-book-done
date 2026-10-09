import { Link } from "@tanstack/react-router";
import {
  ArrowRight, MessageSquareText, ListChecks, HardHat, Home, PackageCheck, Car,
  Truck, Users, ShieldAlert, ShieldCheck, FileText, Images, Activity,
  Camera, Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/* ---------------- 1) How it works ---------------- */

const STEPS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: MessageSquareText,
    title: "Tell us",
    body: "Type, say, or show what you need.",
  },
  {
    icon: ListChecks,
    title: "We understand",
    body: "GetPros turns it into a clear job brief.",
  },
  {
    icon: HardHat,
    title: "A pro handles it",
    body: "Matched to a reviewed local pro near you.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mt-14 scroll-mt-24">
      <header className="max-w-2xl">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-primary">
          How it works
        </span>
        <h2 className="mt-3 text-[clamp(1.5rem,3.4vw,2.25rem)] font-black leading-tight tracking-tight">
          Start with what you need.
        </h2>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          We figure out the right service and match you with a local pro.
        </p>
      </header>

      <ol className="mt-6 grid gap-3 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <li
            key={s.title}
            className="relative overflow-hidden surface-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-card"
          >
            <span className="absolute right-4 top-3 text-4xl font-black leading-none text-muted-foreground/15">
              {i + 1}
            </span>
            <span
              className="grid h-11 w-11 place-items-center rounded-2xl text-white shadow-card"
              style={{ background: i === 0 ? "var(--primary)" : "color-mix(in oklab, var(--secondary) 84%, var(--primary))" }}
            >
              <s.icon className="h-5 w-5" />
            </span>
            <h3 className="mt-3.5 text-base font-black tracking-tight">{s.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ---------------- 2) One request. Multiple tasks. ---------------- */

type Bundle = {
  title: string;
  request: string;
  tasks: string[];
  category: string;
  note?: string;
};

const BUNDLES: Bundle[] = [
  {
    title: "Guests arriving",
    request: "“Get my apartment ready.”",
    tasks: ["Deep clean", "Bathroom refresh", "Bed setup"],
    category: "cleaning",
  },
  {
    title: "Moving day",
    request: "“Help me move Saturday.”",
    tasks: ["Packing", "Movers", "Junk removal", "Move-out clean"],
    category: "moving",
  },
  {
    title: "Car problem",
    request: "“My car is making a strange noise.”",
    tasks: ["Diagnose", "Route to mobile auto help"],
    category: "auto-mobile",
  },
  {
    title: "Vacation prep",
    request: "“Keep the house fine while we’re away.”",
    tasks: ["Home check", "Plant care", "Yard tidy"],
    category: "lawn-outdoor",
  },
  {
    title: "Help my parents",
    request: "“A hand around the house this week.”",
    tasks: ["Errands", "Household help", "Check-in visit"],
    note: "Practical help only — not medical or nursing care.",
    category: "errands",
  },
];

export function OutcomeBundles() {
  return (
    <section className="mt-14">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="max-w-2xl">
          <h2 className="text-[clamp(1.5rem,3.4vw,2.25rem)] font-black leading-tight tracking-tight">
            One request. Multiple tasks.
          </h2>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Big jobs often need more than one service.
          </p>
        </div>
        <Link to="/services" className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-primary hover:underline">
          Browse all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </header>

      <div className="gpb-edge-md mt-5 flex snap-x gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-2 md:overflow-visible xl:grid-cols-3">
        {BUNDLES.map((b) => (
          <article
            key={b.title}
            className="flex w-[82%] shrink-0 snap-start flex-col surface-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-card min-[430px]:w-[74%] md:w-auto"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-black tracking-tight">{b.title}</h3>
              <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                GetPros coordinates
              </span>
            </div>
            <p className="mt-2 text-sm italic leading-relaxed text-foreground/80">{b.request}</p>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {b.tasks.map((t) => (
                <li
                  key={t}
                  className="rounded-full border border-border/60 bg-background px-2.5 py-1 text-xs font-semibold text-muted-foreground"
                >
                  {t}
                </li>
              ))}
            </ul>
            {b.note && <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{b.note}</p>}
            <div className="mt-auto pt-4">
              <Link
                to="/services/$category"
                params={{ category: b.category }}
                className="inline-flex items-center gap-1.5 text-xs font-black text-primary hover:underline"
              >
                Start request <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ---------------- 3) Daily life modules ---------------- */

type ModuleCard = {
  icon: LucideIcon;
  title: string;
  body: string;
  category?: string;
  href?: string;
  tone: string;
};

const MODULES: ModuleCard[] = [
  { icon: Home, title: "Home", body: "Repairs, cleaning, installs.", category: "handyman", tone: "var(--primary)" },
  { icon: PackageCheck, title: "Errands", body: "Pickups, drop-offs, small tasks.", category: "errands", tone: "var(--secondary)" },
  { icon: Car, title: "Auto", body: "Mobile detailing and repair.", category: "auto-mobile", tone: "var(--sky-ink)" },
  { icon: Truck, title: "Moving", body: "Packing, lifting, move-out clean.", category: "moving", tone: "var(--coral-ink)" },
  { icon: Users, title: "Family help", body: "Errands and household help.", category: "errands", tone: "var(--lavender)" },
  { icon: ShieldAlert, title: "Emergency", body: "Burst pipe, no power, lockout.", href: "/emergency", tone: "var(--destructive)" },
];

export function DailyLifeModules() {
  return (
    <section className="mt-14">
      <header className="max-w-2xl">
        <h2 className="text-[clamp(1.5rem,3.4vw,2.25rem)] font-black leading-tight tracking-tight">
          Popular services
        </h2>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          Start with any of these — or just describe your job.
        </p>
      </header>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((m) => (
          <Link
            key={m.title}
            {...(m.category
              ? { to: "/services/$category" as const, params: { category: m.category } }
              : { to: "/emergency" as const })}
            className="group flex items-start gap-3.5 surface-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-card sm:p-5"
          >
            <span
              className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-border/60 bg-background"
              style={{ color: m.tone }}
            >
              <m.icon className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-black tracking-tight text-foreground">{m.title}</span>
              <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{m.body}</span>
            </span>
            <ArrowRight className="ml-auto mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ---------------- 4) Show GP (elevated) ---------------- */

export function ShowGpbBand() {
  return (
    <section className="mt-12 overflow-hidden surface-card">
      <div className="grid gap-5 p-5 sm:p-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Not sure?
          </span>
          <h2 className="mt-3 text-[clamp(1.4rem,3.2vw,2.1rem)] font-black leading-tight tracking-tight">
            Show us the problem.
          </h2>
          <p className="mt-2 max-w-[44ch] text-sm leading-relaxed text-muted-foreground">
            Point your camera at it. We’ll turn the scene into a clear job brief.
          </p>

          <Link
            to="/snap"
            data-analytics-id="show_gpb_cta"
            data-analytics-location="homepage_band"
            className="mt-5 inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-black text-white shadow-elevated transition-transform hover:scale-[1.01]"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Camera className="h-5 w-5" /> Show GP
          </Link>
        </div>
        <ul className="grid gap-2 text-sm">
          {[
            "Photo, video, or text",
            "We read the scene and your words",
            "Low confidence? We ask, not guess",
          ].map((l) => (
            <li key={l} className="flex items-start gap-2 rounded-2xl border border-border/60 bg-background px-4 py-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span className="text-muted-foreground">{l}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------------- 5) Trust ---------------- */

const TRUST: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: FileText, title: "Clear scope", body: "A written brief both sides can see." },
  { icon: ShieldCheck, title: "Reviewed pros", body: "Pros register service area and coverage first." },
  { icon: Images, title: "Proof of work", body: "Before & after images kept with the job." },
  { icon: Activity, title: "Track status", body: "Follow the job from brief to done." },
];

export function TrustSection() {
  return (
    <section className="mt-14">
      <header className="max-w-2xl">
        <h2 className="text-[clamp(1.5rem,3.4vw,2.25rem)] font-black leading-tight tracking-tight">
          Hand it off with confidence.
        </h2>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          Every job gets a clear scope, a verified pro, and tracked status.
        </p>
      </header>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {TRUST.map((t) => (
          <div key={t.title} className="surface-card p-5">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
              <t.icon className="h-5 w-5" />
            </span>
            <h3 className="mt-3 text-sm font-black tracking-tight">{t.title}</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{t.body}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        Launching city by city as verified pros join each area.
      </p>
    </section>
  );
}

/* ---------------- 6) Browse fallback ---------------- */

export function BrowseFallback() {
  return (
    <section className="mt-10 rounded-2xl border border-dashed border-border bg-muted/25 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-black tracking-tight sm:text-lg">Prefer to browse?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The full GetPros catalog is here.
          </p>
        </div>
        <Link
          to="/services"
          className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-bold text-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          Browse <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

/* Sections 7-8 (day-plan orchestrator band) are deferred with the general
   day planner — the services-only experience does not link to /plan. */

const FLOW: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: Camera, title: "Show or tell", body: "Photo, voice, or text." },
  { icon: ListChecks, title: "See what’s needed", body: "We turn it into a clear service request." },
  { icon: HardHat, title: "Get a local pro", body: "Matched to a verified pro near you." },
];

export function SimpleFlow() {
  return (
    <section className="mt-10 sm:mt-14">
      <ol className="grid gap-3 md:grid-cols-3">
        {FLOW.map((s, i) => (
          <li
            key={s.title}
            className="surface-card p-6 transition-all hover:-translate-y-0.5 hover:shadow-card"
          >
            <span
              className="grid h-12 w-12 place-items-center rounded-2xl text-white shadow-card"
              style={{ background: i === 0 ? "var(--primary)" : "color-mix(in oklab, var(--secondary) 84%, var(--primary))" }}
            >
              <s.icon className="h-5 w-5" />
            </span>
            <h2 className="mt-4 text-lg font-black tracking-tight">{s.title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ---------------- 10) Expandable detail (homepage) ---------------- */

export function HowGpbWorksDetails() {
  return (
    <section id="how-it-works" className="mt-8 scroll-mt-24">
      <details open className="group surface-card p-5 sm:p-6">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-base font-black tracking-tight">
          How it works
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border/60 text-muted-foreground transition-transform group-open:rotate-90">
            <ArrowRight className="h-4 w-4" />
          </span>
        </summary>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.title} className="rounded-2xl border border-border/60 bg-background p-4">
              <h3 className="text-sm font-black tracking-tight">{s.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-border/60 bg-background p-4">
            <h3 className="text-sm font-black tracking-tight">Who does the work</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              Home, cleaning, repairs, moving, errands and auto requests go to verified local professionals.
              We only show pros that are available in your area — otherwise we say so plainly.
            </p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background p-4">
            <h3 className="text-sm font-black tracking-tight">What you can rely on</h3>
            <ul className="mt-1.5 space-y-1 text-xs leading-relaxed text-muted-foreground">
              {TRUST.map((t) => (
                <li key={t.title}>· {t.title} — {t.body}</li>
              ))}
            </ul>
          </div>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          Launching city by city. Nothing is booked until you confirm.
        </p>
      </details>
    </section>
  );
}
