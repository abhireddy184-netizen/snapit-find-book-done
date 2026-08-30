import { Link } from "@tanstack/react-router";
import {
  ArrowRight, MessageSquareText, ListChecks, HardHat, Home, PackageCheck, Car,
  Truck, HeartHandshake, ShieldAlert, ShieldCheck, FileText, Images, Activity,
  Camera, Sparkles, UtensilsCrossed, ShoppingBasket, CarFront, UserRound, Route,
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
    title: "GPB breaks it into tasks",
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
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-primary">
          How GPB works
        </span>
        <h2 className="mt-3 text-[clamp(1.5rem,3.4vw,2.25rem)] font-black leading-tight tracking-tight">
          You don’t need to know which service to choose.
        </h2>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          Most people know the outcome they want, not the trade that delivers it. GPB starts from the outcome.
        </p>
      </header>

      <ol className="mt-6 grid gap-3 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <li
            key={s.title}
            className="relative overflow-hidden rounded-[24px] border border-border/60 bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <span className="absolute right-4 top-3 text-4xl font-black leading-none text-muted-foreground/15">
              {i + 1}
            </span>
            <span
              className="grid h-11 w-11 place-items-center rounded-2xl text-white shadow-md"
              style={{ background: i === 0 ? "var(--gradient-primary)" : "color-mix(in oklab, var(--secondary) 84%, var(--primary))" }}
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
            Real life rarely fits one service. GPB can help coordinate the pieces behind a single outcome.
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
            className="flex w-[82%] shrink-0 snap-start flex-col rounded-[24px] border border-border/60 bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md min-[430px]:w-[74%] md:w-auto"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-black tracking-tight">{b.title}</h3>
              <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                GPB can coordinate
              </span>
            </div>
            <p className="mt-2 text-sm italic leading-relaxed text-foreground/80">{b.request}</p>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {b.tasks.map((t) => (
                <li
                  key={t}
                  className="rounded-full border border-border/60 bg-background px-2.5 py-1 text-[11px] font-semibold text-muted-foreground"
                >
                  {t}
                </li>
              ))}
            </ul>
            {b.note && <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">{b.note}</p>}
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
          Whatever the day throws at you.
        </h2>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          Six ways people put GPB to work — each one starts with a request, not a category list.
        </p>
      </header>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((m) => (
          <Link
            key={m.title}
            {...(m.category
              ? { to: "/services/$category" as const, params: { category: m.category } }
              : { to: "/emergency" as const })}
            className="group flex items-start gap-3.5 rounded-[24px] border border-border/60 bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md sm:p-5"
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

/* ---------------- 4) Show GPB (elevated) ---------------- */

export function ShowGpbBand() {
  return (
    <section className="mt-14 overflow-hidden rounded-[28px] border border-border/60 bg-card shadow-sm">
      <div className="grid gap-5 p-5 sm:p-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-black text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Another way to ask
          </span>
          <h2 className="mt-3 text-[clamp(1.4rem,3.2vw,2.1rem)] font-black leading-tight tracking-tight">
            Don’t know what’s wrong? Show us.
          </h2>
          <p className="mt-2 max-w-[54ch] text-sm leading-relaxed text-muted-foreground">
            Point your camera at the problem, record a few seconds of video, or upload a photo. GPB reads
            the scene, tells you what it likely needs, and turns it into the same clear job brief.
          </p>
          <Link
            to="/snap"
            data-analytics-id="show_gpb_cta"
            data-analytics-location="homepage_band"
            className="mt-5 inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-black text-white shadow-lg transition-transform hover:scale-[1.02]"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Camera className="h-5 w-5" /> Show GPB
          </Link>
        </div>
        <ul className="grid gap-2 text-sm">
          {[
            "Photo, video, or plain text — all work",
            "We separate what’s detected from what you described",
            "Low confidence? GPB asks instead of guessing",
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
          Handing off a job means trusting the process. Here’s what GPB puts in writing.
        </p>
      </header>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {TRUST.map((t) => (
          <div key={t.title} className="rounded-[24px] border border-border/60 bg-card p-5 shadow-sm">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
              <t.icon className="h-5 w-5" />
            </span>
            <h3 className="mt-3 text-sm font-black tracking-tight">{t.title}</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{t.body}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        GPB is in early access and launching city by city — coverage grows as verified professionals join each area.
      </p>
    </section>
  );
}

/* ---------------- 6) Browse fallback ---------------- */

export function BrowseFallback() {
  return (
    <section className="mt-12 rounded-[24px] border border-dashed border-border bg-muted/25 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-black tracking-tight sm:text-lg">Prefer to browse? Choose a service.</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The full GPB catalogue is still here — every category and sub-service.
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

/* ---------------- 7) Orchestrator: one outcome, many channels ---------------- */

const CHANNELS: { icon: LucideIcon; title: string; body: string; live: boolean }[] = [
  { icon: HardHat, title: "GPB local pros", body: "Cleaning, handyman, moving, errands, auto and more — live on GPB today.", live: true },
  { icon: UtensilsCrossed, title: "Food ordering", body: "Meals timed around the rest of your plan.", live: false },
  { icon: ShoppingBasket, title: "Grocery pickup or delivery", body: "Kept on your route, or switched to delivery when timing gets tight.", live: false },
  { icon: CarFront, title: "Rides & transport", body: "Departure times worked backwards from your deadline.", live: false },
  { icon: UserRound, title: "You", body: "The steps only you can do — GPB schedules everything else around them.", live: true },
];

export function OrchestratorBand() {
  return (
    <section id="orchestrator" className="mt-14 scroll-mt-24 overflow-hidden rounded-[28px] border border-border/60 bg-card shadow-sm">
      <div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-primary">
            <Route className="h-3.5 w-3.5" /> Tell GPB your day
          </span>
          <h2 className="mt-3 text-[clamp(1.5rem,3.4vw,2.25rem)] font-black leading-tight tracking-tight">
            One outcome. One plan. Consider it done.
          </h2>
          <p className="mt-2 max-w-[56ch] text-sm leading-relaxed text-muted-foreground">
            “I need dinner, groceries, and to be at DFW by 6 PM.” GPB turns a whole part of your day into a
            single sequenced plan — parent goal, linked subtasks, timing, dependencies and a safety buffer.
            Don’t manage the apps; tell GPB what needs to happen.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <Link
              to="/plan"
              search={{ demo: true, q: "", loc: "" }}
              data-analytics-id="plan_demo"
              data-analytics-location="homepage_band"
              className="inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-black text-white shadow-lg transition-transform hover:scale-[1.02]"
              style={{ background: "var(--gradient-primary)" }}
            >
              See an example plan <ArrowRight className="h-4 w-4" />
            </Link>
            <span className="text-[11px] text-muted-foreground">
              Prototype planner — nothing is booked or dispatched.
            </span>
          </div>
        </div>
        <ul className="grid gap-2">
          {CHANNELS.map((c) => (
            <li key={c.title} className="flex items-start gap-3 rounded-2xl border border-border/60 bg-background px-4 py-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <c.icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-black tracking-tight">{c.title}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${c.live ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {c.live ? "Live on GPB" : "Future integration"}
                  </span>
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{c.body}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
