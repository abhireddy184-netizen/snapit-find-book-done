import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { LocationAutocomplete } from "@/components/snapit/LocationAutocomplete";
import { MapPin, Search, Star, ShieldCheck, Clock, Sparkles, ArrowRight, CheckCircle2, Camera, ShieldAlert, Zap, Droplet, Wind, Lock, Facebook, Instagram, Twitter, Youtube, MapPin as MapPinIcon, BadgeCheck, Timer, Award } from "lucide-react";
import { AppShell, Avatar, GradientButton } from "@/components/snapit/AppShell";
import { Logo } from "@/components/snapit/Logo";
import { JourneyRail, InputModes, RoomStory, ProVerticals, SectionConnector, SectionBridge } from "@/components/snapit/HomeStory";
import { ProsOnTheMove } from "@/components/snapit/ProsOnTheMove";
import { providers } from "@/lib/snapit-data";
import { catalog, popularCategories, TOTAL_SERVICES } from "@/lib/catalog";
import { cn } from "@/lib/utils";

const SITE_URL = "https://getperfectboy.com";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GPB — Show the problem. Get it fixed with proof." },
      { name: "description", content: "Show a photo, video, upload an image, or describe what you need. GPB helps identify the right service, compare local pros and keep a clear job record." },
      { property: "og:title", content: "GPB — Show the problem. Get it fixed with proof." },
      { property: "og:description", content: "Photo, video, upload or text — GPB helps identify the right service, compare local pros and keep a clear job record." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE_URL + "/" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "GPB — Show the problem. Get it fixed with proof." },
      { name: "twitter:description", content: "Photo, video, upload or text — GPB helps identify the right service, compare local pros and keep a clear job record." },
    ],
    links: [{ rel: "canonical", href: SITE_URL + "/" }],
  }),
  component: Landing,
});

/** Beauty & personal care is a headline GPB category, so it is hoisted into the first row. */
const homepageCategories = (() => {
  const list = [...popularCategories];
  const i = list.findIndex((c) => c.slug === "beauty-at-home");
  if (i > 0) list.unshift(list.splice(i, 1)[0]!);
  return list.slice(0, 12);
})();

function Landing() {
  const navigate = useNavigate();
  const [location, setLocation] = useState("");
  const [service, setService] = useState("");
  const footerRef = useRef<HTMLElement | null>(null);

  return (
    <AppShell>
      {/* Hero */}
      <section className="aurora-veil relative overflow-hidden rounded-[26px] px-5 py-10 sm:rounded-[32px] sm:px-7 sm:py-12 md:px-12 md:py-16 lg:py-20 xl:px-16 fade-up" style={{ backgroundColor: "color-mix(in oklab, var(--card) 88%, var(--background))" }}>
        <div className="pointer-events-none absolute -right-28 -top-28 h-80 w-80 rounded-full opacity-25 blur-3xl float-slow" style={{ background: "var(--gradient-primary)" }} />
        <div className="pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full opacity-20 blur-3xl float-slow" style={{ background: "var(--gradient-secondary)", animationDelay: "1.6s" }} />
        <div className="relative grid items-start gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-12 xl:gap-16">
          <div className="min-w-0">
          <div className="mb-4 inline-flex max-w-full items-center gap-2 rounded-full border border-primary/20 bg-card/80 px-3 py-1.5 text-[11px] font-bold text-primary shadow-sm backdrop-blur sm:px-3.5 sm:text-xs md:mb-5">
            <Sparkles className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">GetPerfectBoy.com · Show it. Tell us. Get it fixed.</span>
          </div>
          <h1 className="max-w-[16ch] text-[2.15rem] font-black leading-[1.05] tracking-tight text-foreground sm:text-5xl md:max-w-[18ch] md:text-6xl xl:text-7xl">
            Show the problem.{" "}
            <span className="text-gradient-hero">Get it fixed with proof.</span>
          </h1>
          <p className="mt-4 max-w-[58ch] text-[0.95rem] leading-relaxed text-muted-foreground sm:text-base md:mt-5 md:text-lg">
            Upload a photo, record a short video, or just describe it in words. GPB works out what the job actually is,
            turns it into one clear scope and connects you to the right local professional — with before &amp; after proof kept for you.
          </p>

          <div className="mt-5 md:mt-6">
            <InputModes />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void navigate({ to: "/search", search: { q: service.trim(), loc: location.trim() } });
            }}
            className="mt-6 grid gap-2.5 rounded-[22px] bg-card p-2.5 shadow-xl sm:grid-cols-[1.1fr_1.4fr_auto] sm:gap-3 sm:rounded-3xl sm:p-3 md:mt-8"
            style={{ boxShadow: "var(--shadow-elegant)" }}
          >
            <LocationAutocomplete
              value={location}
              onChange={setLocation}
              aria-label="Location"
              placeholder="ZIP or city (e.g. 75034)"
            />
            <label className="flex items-center gap-2 rounded-xl bg-muted/50 px-4 py-3.5 sm:py-3">
              <Search className="h-4 w-4 shrink-0 text-primary" />
              <input
                value={service}
                onChange={(e) => setService(e.target.value)}
                placeholder="What do you need? (e.g. plumber)"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </label>
            <GradientButton type="submit" className="w-full sm:w-auto">
              Find a Pro <ArrowRight className="h-4 w-4" />
            </GradientButton>
          </form>

          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground md:mt-6">
            <span className="inline-flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-primary" /> AI reads photo, video or text</span>
            <span className="inline-flex items-center gap-1.5"><Star className="h-4 w-4 text-primary" /> Like-for-like quotes</span>
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-primary" /> Before &amp; after proof</span>
          </div>
          </div>

          {/* Journey panel — sits beside the hero copy on laptop, stacks on mobile */}
          <div className="min-w-0 rounded-[24px] border border-border/60 bg-card/70 p-4 shadow-sm backdrop-blur md:p-5">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" /> How a GPB job runs
            </div>
            <JourneyRail stacked />
          </div>
        </div>
      </section>

      <ProsOnTheMove />

      <SectionConnector label="One photo · many services" />

      {/* One photo, many services */}
      <section
        className="aurora-veil relative overflow-hidden rounded-[32px] border border-border/50 px-5 py-10 md:px-10 md:py-14"
        style={{ backgroundColor: "color-mix(in oklab, var(--card) 80%, var(--background))" }}
      >
        <div className="relative">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-secondary/25 bg-card/80 px-3.5 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-secondary shadow-sm backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" /> GPB sees the whole scene
          </div>
          <h2 className="max-w-3xl text-3xl font-black leading-tight tracking-tight md:text-4xl">
            One photo can reveal <span className="text-gradient-primary">every service that space needs</span>.
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">
            Tap a marker to see what GPB spots in a single room — then tell us what you actually want, and we scope that
            one job precisely.
          </p>
          <div className="mt-8">
            <RoomStory />
          </div>
        </div>
      </section>

      {/* Provider verticals */}
      <section className="mt-4">
        <SectionBridge label="Pros behind the work" />
        <div className="mt-5">
          <SectionHeader title="Real pros, every vertical" cta={{ label: "Browse all pros", to: "/search" }} />
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            From at-home beauty to electrical, cleaning, lawn care, handyman work and mobile auto — GPB is onboarding
            professionals category by category across the USA.
          </p>
          <div className="mt-6">
            <ProVerticals />
          </div>
        </div>
      </section>

      {/* Popular categories */}
      <section className="mt-16">
        <SectionHeader
          title="Popular services"
          cta={{ label: `All ${TOTAL_SERVICES}+ services`, to: "/services" }}
        />
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
          {homepageCategories.map((cat) => {
            const Icon = cat.icon;
            return (
              <Link
                key={cat.slug}
                to="/services/$category"
                params={{ category: cat.slug }}
                className="group flex h-full flex-col rounded-3xl border border-border/60 bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl active:scale-[0.98]"
              >
                <div className={`grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br ${cat.gradient} text-white shadow-md transition-transform duration-300 group-hover:scale-110`}>
                  <Icon className="h-7 w-7" />
                </div>
                <div className="mt-4 text-sm font-semibold text-foreground">{cat.name}</div>
                <div className="mt-1 text-xs text-muted-foreground line-clamp-1">{cat.tagline}</div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section className="mt-16">
        <SectionHeader title="How GPB works" />
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            { n: "01", t: "Snap & understand", d: "Show the problem. Our AI describes what it likely is, how urgent it is and what it typically costs." },
            { n: "02", t: "Standardize & compare", d: "We turn the diagnosis into one job scope every pro quotes against, so prices are comparable." },
            { n: "03", t: "Book & keep proof", d: "Book the pro you pick, add an after photo and keep a permanent job passport for the work." },
          ].map((s) => (
            <div key={s.n} className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
              <div className="text-4xl font-black text-transparent bg-clip-text" style={{ backgroundImage: "var(--gradient-primary)" }}>{s.n}</div>
              <h3 className="mt-2 text-lg font-bold">{s.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured pros */}
      <section className="mt-16">
        <SectionHeader title="Sample professionals" cta={{ label: "Browse all", to: "/search" }} />
        <p className="mt-2 text-xs text-muted-foreground">Example listings shown while GPB onboards its first local pros.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {providers.slice(0, 3).map((p) => <ProviderCard key={p.id} p={p} />)}
        </div>
      </section>

      {/* Why GPB */}
      <section className="mt-16">
        <SectionHeader title="What GPB is built for" />
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            { title: "AI that explains the problem", text: "Send a photo, a video or a written description and get a plain-language read on the likely category, urgency and typical cost range." },
            { title: "One scope, comparable quotes", text: "Every service pro receives the identical standardized brief, so you compare price, availability and warranty — not guesswork." },
            { title: "Proof that stays with you", text: "Before and after photos, the accepted quote, receipts and warranty notes are kept in a permanent job record." },
          ].map((c) => (
            <div key={c.title} className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
              <div className="grid h-11 w-11 place-items-center rounded-2xl text-white shadow-md" style={{ background: "var(--gradient-primary)" }}>
                <BadgeCheck className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-black">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Emergency Services */}
      <EmergencySection />

      {/* Offer your services on GPB */}
      <ProviderRecruitment />

      <Footer footerRef={footerRef} />
      <FloatingSnapButton footerRef={footerRef} />
    </AppShell>
  );
}

function EmergencySection() {
  return <EmergencySectionInner />;
}

const PRO_TYPES = [
  "Makeup Artist", "Hairstylist", "Nail Tech", "Barber", "Lash & Brow Tech", "Massage Therapist",
  "Plumber", "Electrician", "HVAC Tech", "Handyman", "TV Mounting Pro", "Furniture Repair",
  "Cleaner", "Lawn Care", "Painter", "Tile & Grout Pro", "Appliance Tech", "Mobile Car Detailer",
  "Moving Help", "Pet Grooming", "Pest Control", "Locksmith",
];

function ProviderRecruitment() {
  return (
    <section className="mt-16 overflow-hidden rounded-[28px] px-6 py-12 text-white md:px-12 md:py-16" style={{ background: "var(--gradient-primary)" }}>
      <div className="grid gap-8 lg:grid-cols-[1.25fr_1fr] lg:items-start">
        <div>
          <div className="mb-3 inline-flex rounded-full bg-white/20 px-3 py-1 text-xs font-bold backdrop-blur">For professionals</div>
          <h2 className="text-3xl font-black tracking-tight md:text-4xl">Offer your services on GPB</h2>
          <p className="mt-3 max-w-xl text-white/90">
            GPB is onboarding professionals across the USA — {catalog.length} master categories and {TOTAL_SERVICES}+ services,
            from beauty and personal care to trades, cleaning and outdoor work. You receive a clear, standardized job brief
            instead of a vague enquiry, so you can quote accurately and win the right work.
          </p>

          <div className="mt-6 flex flex-wrap gap-1.5">
            {PRO_TYPES.map((p) => (
              <span key={p} className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold backdrop-blur">{p}</span>
            ))}
          </div>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              to="/register"
              search={{ redirect: undefined, role: "provider" }}
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-primary shadow-lg transition-transform hover:scale-[1.02]"
            >
              Join GPB as a Pro <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/provider-interest"
              className="inline-flex items-center gap-2 rounded-full border border-white/50 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/15"
            >
              Register your interest
            </Link>
          </div>
        </div>

        <ul className="space-y-2 text-sm">
          {[
            "Free business profile with your service ZIP and radius",
            "Standardized job scopes, not vague enquiries",
            "Set your own prices, availability and coverage area",
            "Before & after proof recorded on every job",
            "Onboarding opening market by market across the USA",
          ].map((l) => (
            <li key={l} className="flex items-start gap-2 rounded-2xl bg-white/10 px-4 py-3 backdrop-blur">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {l}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function EmergencySectionInner() {
  const items = [
    { label: "Burst pipe", icon: Droplet, color: "from-[#6EC8FF] to-[#3AA6F0]" },
    { label: "No power", icon: Zap, color: "from-amber-500 to-orange-500" },
    { label: "No heat / AC", icon: Wind, color: "from-[#6EC8FF] to-[#B58CFF]" },
    { label: "Lockout", icon: Lock, color: "from-rose-500 to-red-500" },
  ];
  return (
    <section className="mt-16 relative overflow-hidden rounded-[28px] border border-red-200/70 dark:border-red-500/30 bg-gradient-to-br from-red-50 via-white to-orange-50 dark:from-red-950/40 dark:via-card dark:to-orange-950/30 p-6 md:p-10 shadow-[0_0_60px_-15px_rgba(239,68,68,0.35)]">
      <div className="pointer-events-none absolute -inset-1 rounded-[32px] bg-red-500/10 blur-2xl -z-10 animate-pulse" />
      <div className="grid gap-6 md:grid-cols-[1.2fr_1fr] md:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white shadow-[0_0_0_0_rgba(239,68,68,0.6)] animate-pulse">
            <ShieldAlert className="h-3.5 w-3.5" /> 24/7 Emergency
          </div>
          <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
            When it can't wait,{" "}
            <span className="text-red-600">we dispatch fast.</span>
          </h2>
          <p className="mt-2 max-w-lg text-sm text-muted-foreground md:text-base">
            Flag burst pipes, power outages, lockouts and other urgent issues so they're triaged first. Emergency dispatch goes
            live as pros are onboarded in your area.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/emergency"
              className="inline-flex items-center gap-2 rounded-full bg-red-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition-all hover:scale-[1.02] hover:bg-red-700 hover:shadow-xl"
            >
              <ShieldAlert className="h-4 w-4" /> Get emergency help
            </Link>
            <Link
              to="/snap"
              className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-white px-6 py-3 text-sm font-semibold text-red-700 transition-all hover:scale-[1.02] hover:bg-red-50 dark:bg-card dark:text-red-400 dark:border-red-500/30 dark:hover:bg-red-950/30"
            >
              <Camera className="h-4 w-4" /> Snap the problem
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {items.map((it) => (
            <Link
              key={it.label}
              to="/emergency"
              className="group flex items-center gap-3 rounded-2xl border border-red-100 dark:border-red-500/20 bg-white dark:bg-card p-3 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all active:scale-[0.98]"
            >
              <div className={`grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${it.color} text-white shadow-md`}>
                <it.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-bold">{it.label}</div>
                <div className="text-[11px] text-muted-foreground">Dispatch now</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function FloatingSnapButton({ footerRef }: { footerRef: React.RefObject<HTMLElement | null> }) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const el = footerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setHidden(entry.isIntersecting), {
      rootMargin: "0px 0px -20% 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [footerRef]);
  return (
    <Link
      to="/snap"
      aria-label="Snap a problem for AI diagnosis"
      className={cn(
        "fixed bottom-24 right-4 z-50 flex items-center gap-1.5 rounded-full py-2.5 pl-3 pr-4 text-xs font-bold text-white transition-all duration-300 hover:scale-105 active:scale-95 md:bottom-6 md:right-6 pulse-soft",
        hidden ? "translate-y-24 opacity-0 pointer-events-none" : "translate-y-0 opacity-100"
      )}
      style={{ background: "var(--gradient-primary)" }}
    >
      <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
        <span className="absolute inset-0 animate-ping rounded-full bg-white/30" />
        <Camera className="relative h-4 w-4" />
      </span>
      <span>Snap a Problem</span>
      <span className="ml-1 hidden items-center gap-1 rounded-full bg-white/25 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider sm:inline-flex">
        <Sparkles className="h-2.5 w-2.5" /> AI
      </span>
    </Link>
  );
}

function ProviderCard({ p }: { p: (typeof providers)[number] }) {
  return (
    <Link
      to="/provider/$id"
      params={{ id: p.id }}
      className="group relative flex h-full flex-col rounded-3xl border border-border/60 bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl active:scale-[0.99]"
    >
      <div className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-mint/20 px-2 py-1 text-[10px] font-bold text-mint-ink">
        <span className="h-1.5 w-1.5 rounded-full bg-mint animate-pulse" /> Available now
      </div>
      <div className="flex items-center gap-3">
        <Avatar initials={p.initials} gradient={p.gradient} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <div className="truncate font-bold">{p.name}</div>
            {p.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-primary" />}
          </div>
          <div className="truncate text-xs text-muted-foreground">{p.business}</div>
        </div>
      </div>
      <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>
      <div className="mt-4 grid grid-cols-3 gap-2 text-[11px]">
        <Stat icon={Award} label={`${p.yearsExperience}+ yrs`} />
        <Stat icon={Timer} label="~15 min" />
        <Stat icon={MapPinIcon} label={`${p.distance} mi`} />
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-4 text-xs">
        <span className="inline-flex items-center gap-1 font-semibold text-foreground">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {p.rating}
          <span className="font-normal text-muted-foreground">({p.reviews})</span>
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="text-muted-foreground">from</span>
          <span className="font-bold text-primary">${p.startingPrice}</span>
        </span>
      </div>
      <div
        className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-full py-2 text-xs font-bold text-white shadow-md transition-transform group-hover:scale-[1.02]"
        style={{ background: "var(--gradient-primary)" }}
      >
        Book now <ArrowRight className="h-3.5 w-3.5" />
      </div>
    </Link>
  );
}

function Stat({ icon: Icon, label }: { icon: typeof Timer; label: string }) {
  return (
    <div className="flex items-center gap-1 rounded-lg bg-muted/60 px-2 py-1.5 text-muted-foreground">
      <Icon className="h-3 w-3" />
      <span className="truncate font-semibold text-foreground">{label}</span>
    </div>
  );
}

function SectionHeader({ title, cta }: { title: string; cta?: { label: string; to: string } }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <h2 className="text-2xl font-black tracking-tight md:text-3xl">{title}</h2>
      {cta && (
        <Link to={cta.to} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
          {cta.label} <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

export function Footer({ footerRef }: { footerRef?: React.RefObject<HTMLElement | null> }) {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  return (
    <footer ref={footerRef} className="mt-24 rounded-t-[32px] border-t border-border/60 bg-gradient-to-b from-transparent to-muted/40 pt-14 pb-8 text-sm text-muted-foreground">
      <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1.4fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs leading-relaxed">Show it. Tell us. Get it fixed. AI-powered matching between customers and trusted local pros.</p>
          <div className="mt-5 flex items-center gap-2">
            {[Facebook, Instagram, Twitter, Youtube].map((Icon, i) => (
              <a key={i} href="#" aria-label="Social" className="grid h-9 w-9 place-items-center rounded-full border border-border/60 bg-card text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary">
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
          <div className="mt-5 text-xs">USA-wide services marketplace · GetPerfectBoy.com</div>
        </div>
        <FooterCol title="Company" links={["About", "Careers", "Press", "Blog"]} />
        <FooterCol title="Support" links={["Help center", "Contact", "Trust & safety", "Cancellation"]} />
        <div>
          <div className="mb-3 text-xs font-bold uppercase tracking-wider text-foreground">Stay in the loop</div>
          <p className="text-xs">Product updates, new services and stories from our pros.</p>
          <form
            onSubmit={(e) => { e.preventDefault(); if (email) { setSubscribed(true); setEmail(""); } }}
            className="mt-3 flex overflow-hidden rounded-full border border-border/60 bg-card p-1 shadow-sm"
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="min-w-0 flex-1 bg-transparent px-3 text-xs outline-none placeholder:text-muted-foreground"
            />
            <button type="submit" className="rounded-full px-4 py-2 text-xs font-bold text-white transition-transform hover:scale-[1.02]" style={{ background: "var(--gradient-primary)" }}>
              {subscribed ? "Subscribed" : "Subscribe"}
            </button>
          </form>
          {subscribed && <div className="mt-2 text-[11px] font-semibold text-mint-ink">Thanks! Check your inbox.</div>}
        </div>
      </div>
      <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-border/60 pt-8 text-xs md:flex-row md:items-center">
        <div className="flex flex-col gap-1">
          <span className="text-base font-black tracking-tight text-foreground">GPB</span>
          <span>© {new Date().getFullYear()} GetPerfectBoy.com. All rights reserved.</span>
        </div>
        <div className="flex flex-wrap gap-5"><a href="#">Privacy</a><a href="#">Terms</a><a href="#">Cookies</a><a href="#">Accessibility</a><a href="#">Sitemap</a></div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: string[] }) {
  return (
    <div>
      <div className="mb-3 text-xs font-bold uppercase tracking-wider text-foreground">{title}</div>
      <ul className="space-y-2">{links.map((l) => <li key={l}>{l}</li>)}</ul>
    </div>
  );
}
