import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { MapPin, Search, Star, ShieldCheck, Clock, Sparkles, ArrowRight, CheckCircle2, Camera, ShieldAlert, Zap, Droplet, Wind, Lock, Facebook, Instagram, Twitter, Youtube, Mail, Phone, MapPin as MapPinIcon, BadgeCheck, Timer, Award } from "lucide-react";
import { AppShell, Avatar, GradientButton } from "@/components/snapit/AppShell";
import { Logo } from "@/components/snapit/Logo";
import { categories, providers } from "@/lib/snapit-data";
import { cn } from "@/lib/utils";

const SITE_URL = "https://id-preview--bca1ede1-6b69-4084-95f5-53bb43a6c24e.lovable.app";
const OG_IMAGE = `${SITE_URL}/__l5e/assets-v1/a199e0d6-211d-4b74-ab79-c58ffbd2870e/og-snapit.jpg`;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SnapIt — AI-Powered Local Services Marketplace" },
      { name: "description", content: "One photo. One tap. Problem solved. Use AI to instantly identify home or personal service needs, compare trusted local professionals, and book in minutes." },
      { property: "og:title", content: "SnapIt — AI-Powered Local Services Marketplace" },
      { property: "og:description", content: "One photo. One tap. Problem solved. Use AI to instantly identify home or personal service needs, compare trusted local professionals, and book in minutes." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE_URL + "/" },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "SnapIt — AI-Powered Local Services Marketplace" },
      { name: "twitter:description", content: "One photo. One tap. Problem solved. Use AI to instantly identify home or personal service needs, compare trusted local professionals, and book in minutes." },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: SITE_URL + "/" }],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const [location, setLocation] = useState("");
  const [service, setService] = useState("");
  const footerRef = useRef<HTMLElement | null>(null);

  return (
    <AppShell>
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[28px] px-6 py-16 md:px-14 md:py-24 fade-up" style={{ background: "var(--gradient-soft)" }}>
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-30 blur-3xl" style={{ background: "var(--gradient-primary)" }} />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full opacity-20 blur-3xl" style={{ background: "var(--gradient-primary)" }} />
        <div className="relative">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-card/80 px-3.5 py-1.5 text-xs font-semibold text-primary shadow-sm backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" /> Snap it. Book it. Done.
          </div>
          <h1 className="max-w-4xl text-[2.5rem] font-black leading-[1.05] tracking-tight text-foreground md:text-7xl">
            One Photo. One Tap.{" "}
            <span className="text-gradient-hero">Problem Solved.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-xl">
            Use AI to identify your problem instantly and connect with trusted local professionals in minutes.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              navigate({ to: "/search", search: { q: service, loc: location } as never });
            }}
            className="mt-10 grid gap-3 rounded-3xl bg-card p-3 shadow-xl md:grid-cols-[1.2fr_1.5fr_auto]"
            style={{ boxShadow: "var(--shadow-elegant)" }}
          >
            <label className="flex items-center gap-2 rounded-xl bg-muted/50 px-4 py-3">
              <MapPin className="h-4 w-4 shrink-0 text-primary" />
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Your location"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </label>
            <label className="flex items-center gap-2 rounded-xl bg-muted/50 px-4 py-3">
              <Search className="h-4 w-4 shrink-0 text-primary" />
              <input
                value={service}
                onChange={(e) => setService(e.target.value)}
                placeholder="What do you need? (e.g. plumber)"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </label>
            <GradientButton type="submit" className="w-full md:w-auto">
              Find a Pro <ArrowRight className="h-4 w-4" />
            </GradientButton>
          </form>

          <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-primary" /> Background-checked</span>
            <span className="inline-flex items-center gap-1.5"><Star className="h-4 w-4 text-primary" /> Upfront pricing</span>
            <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4 text-primary" /> Same-day bookings</span>
          </div>
        </div>
      </section>

      {/* Popular categories */}
      <section className="mt-14">
        <SectionHeader title="Popular services" cta={{ label: "View all", to: "/categories" }} />
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
          {categories.slice(0, 10).map((cat) => {
            const Icon = cat.icon;
            return (
              <Link
                key={cat.slug}
                to="/search"
                search={{ cat: cat.slug } as never}
                className="group flex h-full flex-col rounded-3xl border border-border/60 bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl active:scale-[0.98]"
              >
                <div className={`grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br ${cat.color} text-white shadow-md transition-transform duration-300 group-hover:scale-110`}>
                  <Icon className="h-7 w-7" />
                </div>
                <div className="mt-4 text-sm font-semibold text-foreground">{cat.name}</div>
                <div className="mt-1 text-xs text-muted-foreground line-clamp-1">{cat.description}</div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section className="mt-16">
        <SectionHeader title="How SnapIt works" />
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            { n: "01", t: "Snap a photo", d: "Show us the problem or the service you need in seconds." },
            { n: "02", t: "Match with pros", d: "See vetted local pros ranked by rating, price and distance." },
            { n: "03", t: "Book and relax", d: "Confirm the time that works for you. The pro is on the way." },
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
        <p className="mt-2 text-xs text-muted-foreground">Example listings shown while SnapIt onboards its first local pros.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {providers.slice(0, 3).map((p) => <ProviderCard key={p.id} p={p} />)}
        </div>
      </section>

      {/* Why SnapIt */}
      <section className="mt-16">
        <SectionHeader title="What SnapIt is built for" />
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            { title: "AI-powered service matching", text: "Snap a photo and our AI identifies the likely problem, category and cost range before you book." },
            { title: "Clear, upfront estimates", text: "See an estimated price and duration up front, so there are no surprises when a pro arrives." },
            { title: "Built for trusted local pros", text: "Providers create real business profiles. Verification badges only appear once a pro is reviewed." },
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

      {/* Become a provider */}
      <section className="mt-16 overflow-hidden rounded-[28px] px-6 py-12 text-white md:px-12 md:py-16" style={{ background: "var(--gradient-primary)" }}>
        <div className="grid gap-6 md:grid-cols-[1.4fr_1fr] md:items-center">
          <div>
            <div className="mb-3 inline-flex rounded-full bg-white/20 px-3 py-1 text-xs font-medium backdrop-blur">For pros</div>
            <h2 className="text-3xl font-black md:text-4xl">Grow your business with SnapIt</h2>
            <p className="mt-3 max-w-xl text-white/90">Get matched with local customers who need you today. Zero setup fees, transparent payouts and tools that make running your business easier.</p>
            <div className="mt-6">
              <Link
                to="/register"
                search={{ redirect: undefined }}
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-primary shadow-lg transition-transform hover:scale-[1.02]"
              >
                Become a Provider <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <ul className="space-y-2 text-sm">
            {["Free profile and instant leads", "Set your own prices and schedule", "Get paid weekly, hassle-free", "Real reviews from real customers"].map((l) => (
              <li key={l} className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3 backdrop-blur">
                <CheckCircle2 className="h-4 w-4 shrink-0" /> {l}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Footer footerRef={footerRef} />
      <FloatingSnapButton footerRef={footerRef} />
    </AppShell>
  );
}

function EmergencySection() {
  const items = [
    { label: "Burst pipe", icon: Droplet, color: "from-blue-500 to-cyan-500" },
    { label: "No power", icon: Zap, color: "from-amber-500 to-orange-500" },
    { label: "No heat / AC", icon: Wind, color: "from-sky-500 to-indigo-500" },
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
            On-call verified pros for burst pipes, power outages, lockouts and more. Average arrival under 20 minutes.
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
      <div className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Available now
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
          <p className="mt-4 max-w-xs leading-relaxed">Snap it. Book it. Done. AI-powered matching between customers and trusted local pros.</p>
          <div className="mt-5 flex items-center gap-2">
            {[Facebook, Instagram, Twitter, Youtube].map((Icon, i) => (
              <a key={i} href="#" aria-label="Social" className="grid h-9 w-9 place-items-center rounded-full border border-border/60 bg-card text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary">
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
          <div className="mt-5 space-y-1.5 text-xs">
            <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-primary" /> hello@snapit.app</div>
            <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-primary" /> +1 (415) 555-SNAP</div>
            <div className="flex items-center gap-2"><MapPinIcon className="h-3.5 w-3.5 text-primary" /> San Francisco, CA</div>
          </div>
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
          {subscribed && <div className="mt-2 text-[11px] font-semibold text-emerald-500">Thanks! Check your inbox.</div>}
        </div>
      </div>
      <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-border/60 pt-8 text-xs md:flex-row md:items-center">
        <div className="flex flex-col gap-1">
          <span className="text-base font-black tracking-tight text-foreground">SnapIt</span>
          <span>© {new Date().getFullYear()} SnapIt Technologies, Inc. All rights reserved.</span>
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
