import { Link } from "@tanstack/react-router";
import {
  ArrowRight, MessageSquareText, ListChecks, HardHat, Home, PackageCheck, Car,
  Truck, HeartHandshake, ShieldAlert, ShieldCheck, FileText, Images, Activity,
  Camera, Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/* ---------------- 1) How it works ---------------- */

const STEPS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: MessageSquareText,
    title: "Tell us the outcome",
    body: "Describe the result you want — or show it with a photo or video. No category picking, no service jargon.",
  },
  {
    icon: ListChecks,
    title: "GetPros breaks it into tasks",
    body: "We turn your request into a clear job brief: what’s likely needed, what it should cover, and what it typically costs.",
  },
  {
    icon: HardHat,
    title: "Trusted pros get it done",
    body: "The brief goes to local professionals for the work — so you get a real scope instead of guessing which trade to call.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mt-14 scroll-mt-24">
      <header className="max-w-2xl">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-primary">
          How GetPros works
        </span>
        <h2 className="mt-3 text-[clamp(1.5rem,3.4vw,2.25rem)] font-black leading-tight tracking-tight">
          You don’t need to know which service to choose.
        </h2>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          Most people know the outcome they want, not the trade that delivers it. GetPros starts from the outcome.
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
    title: "Guests coming tomorrow",
    request: "“My parents are visiting tomorrow. Get my apartment ready.”",
    tasks: ["Deep clean", "Bathroom refresh", "Bed & room setup"],
    category: "cleaning",
  },
  {
    title: "Moving day",
    request: "“I’m moving Saturday. Help me get everything done.”",
    tasks: ["Packing help", "Movers", "Junk removal", "Move-out clean"],
    category: "moving",
  },
  {
    title: "Car problem",
    request: "“My car is making a strange noise. Handle it.”",
    tasks: ["Describe or show the issue", "Route to mobile auto help"],
    category: "auto-mobile",
  },
  {
    title: "Vacation prep",
    request: "“We’re away for ten days. Keep the house fine.”",
    tasks: ["Home check", "Plant & yard care", "Household tasks"],
    category: "lawn-outdoor",
  },
  {
    title: "Help my parents",
    request: "“My parents need a hand around the house this week.”",
    tasks: ["Errands", "Household help", "Check-in visit"],
    note: "Practical household support only — not medical or nursing care.",
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
            Real life rarely fits one service. GetPros can help coordinate the pieces behind a single outcome.
          </p>
        </div>
        <Link to="/services" className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-primary hover:underline">
          Browse all services <ArrowRight className="h-3.5 w-3.5" />
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
                GetPros can coordinate
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
                Start this request <ArrowRight className="h-3.5 w-3.5" />
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
  { icon: Home, title: "Home", body: "Repairs, cleaning, installs and upkeep.", category: "handyman", tone: "var(--primary)" },
  { icon: PackageCheck, title: "Errands & returns", body: "Pickups, drop-offs and the small stuff.", category: "errands", tone: "var(--secondary)" },
  { icon: Car, title: "Auto help", body: "Mobile detailing, diagnosis and routing.", category: "auto-mobile", tone: "var(--sky-ink)" },
  { icon: Truck, title: "Moving & travel prep", body: "Packing, movers, junk and move-out cleans.", category: "moving", tone: "var(--coral-ink)" },
  { icon: HeartHandshake, title: "Family assistance", body: "Household help and errands for loved ones.", category: "errands", tone: "var(--lavender)" },
  { icon: ShieldAlert, title: "Emergency help", body: "Burst pipe, no power, no heat, lockout.", href: "/emergency", tone: "var(--destructive)" },
];

export function DailyLifeModules() {
  return (
    <section className="mt-14">
      <header className="max-w-2xl">
        <h2 className="text-[clamp(1.5rem,3.4vw,2.25rem)] font-black leading-tight tracking-tight">
          Services people ask GetPros for.
        </h2>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          Six of the most requested areas — each one starts with your request, not a category list.
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

/* ---------------- 4) Show GetPros (elevated) ---------------- */

export function ShowGpbBand() {
  return (
    <section className="mt-14 overflow-hidden surface-card">
      <div className="grid gap-5 p-5 sm:p-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Another way to ask
          </span>
          <h2 className="mt-3 text-[clamp(1.4rem,3.2vw,2.1rem)] font-black leading-tight tracking-tight">
            Don’t know what’s wrong? Show us.
          </h2>
          <p className="mt-2 max-w-[44ch] text-sm leading-relaxed text-muted-foreground">
            Point your camera at the problem. GetPros reads the scene and turns it into a clear job brief.
          </p>

          <Link
            to="/snap"
            data-analytics-id="show_gpb_cta"
            data-analytics-location="homepage_band"
            className="mt-5 inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-black text-white shadow-elevated transition-transform hover:scale-[1.01]"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Camera className="h-5 w-5" /> Show GetPros
          </Link>
        </div>
        <ul className="grid gap-2 text-sm">
          {[
            "Photo, video, or plain text — all work",
            "We separate what’s detected from what you described",
            "Low confidence? GetPros asks instead of guessing",
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
  { icon: FileText, title: "A clear job brief", body: "Every request becomes a written scope both sides can see — no vague enquiries." },
  { icon: ShieldCheck, title: "Provider profiles", body: "Pros register with their service area, coverage and details before they can be matched." },
  { icon: Images, title: "Before & after proof", body: "Completed jobs can store before and after images with the job record." },
  { icon: Activity, title: "Transparent status", body: "Follow the request from brief to booked to done in your dashboard." },
];

export function TrustSection() {
  return (
    <section className="mt-14">
      <header className="max-w-2xl">
        <h2 className="text-[clamp(1.5rem,3.4vw,2.25rem)] font-black leading-tight tracking-tight">
          Built so you can hand it over.
        </h2>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          Handing off a job means trusting the process. Here’s what GetPros puts in writing.
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
        GetPros is in early access and launching city by city — coverage grows as verified professionals join each area.
      </p>
    </section>
  );
}

/* ---------------- 6) Browse fallback ---------------- */

export function BrowseFallback() {
  return (
    <section className="mt-12 rounded-2xl border border-dashed border-border bg-muted/25 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-black tracking-tight sm:text-lg">Prefer to browse? Choose a service.</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The full GetPros catalogue is still here — every category and sub-service.
          </p>
        </div>
        <Link
          to="/services"
          className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-bold text-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          Browse services <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

/* Sections 7-8 (day-plan orchestrator band) are deferred with the general
   day planner — the services-only experience does not link to /plan. */

const FLOW: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: Camera, title: "Show or tell GetPros", body: "Photo, voice in any language, or plain text — whatever is easiest." },
  { icon: ListChecks, title: "See what's needed", body: "GetPros turns it into a short, clear service request you can edit." },
  { icon: HardHat, title: "Get a local pro", body: "We match a real, available pro near you — or tell you honestly if there isn't one yet." },
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
    <section id="how-it-works" className="mt-10 scroll-mt-24">
      <details className="group surface-card p-5 sm:p-6">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-base font-black tracking-tight">
          How GetPros works
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
              Home, cleaning, repairs, moving, errands and auto requests go through the GetPros service
              catalogue and local professionals. GetPros only shows pros that are real, verified and available
              in your area — otherwise it says so plainly.
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
          GetPros is in early access and launching city by city. Nothing is booked until you say so.
        </p>
      </details>
    </section>
  );
}
