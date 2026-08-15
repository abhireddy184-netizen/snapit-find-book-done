import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { LocationAutocomplete } from "@/components/snapit/LocationAutocomplete";
import {
  Search, ArrowRight, CheckCircle2, Camera, ShieldAlert, Zap, Droplet, Wind, Lock,
  Facebook, Instagram, Twitter, Youtube, Sparkles,
} from "lucide-react";
import { AppShell, GradientButton } from "@/components/snapit/AppShell";
import { Logo, Wordmark } from "@/components/snapit/Logo";
import { AiJourneyStrip, CategoryIconRow, HomeRows } from "@/components/snapit/HomeSections";
import { ProsOnTheMove } from "@/components/snapit/ProsOnTheMove";
import { catalog, TOTAL_SERVICES } from "@/lib/catalog";
import heroProblemAsset from "@/assets/uploaded-services/plumbing-service.png.asset.json";

const heroProblem = heroProblemAsset.url;

const SITE_URL = "https://getperfectboy.com";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GPB — Show it. We'll handle the rest." },
      { name: "description", content: "Show GPB a photo, video or description and we'll route you to the right local service professional — with before & after proof." },
      { property: "og:title", content: "GPB — Show it. We'll handle the rest." },
      { property: "og:description", content: "Show GPB a photo, video or description and we'll route you to the right local service." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE_URL + "/" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "GPB — Show it. We'll handle the rest." },
      { name: "twitter:description", content: "Show GPB a photo, video or description and we'll route you to the right local service." },
    ],
    links: [{ rel: "canonical", href: SITE_URL + "/" }],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const [location, setLocation] = useState("");
  const [service, setService] = useState("");

  return (
    <AppShell>
      {/* Hero — brand lockup, search, camera-first visual */}
      <section className="fade-up relative overflow-hidden rounded-[26px] border border-border/50 px-4 py-6 sm:rounded-[30px] sm:px-6 sm:py-8 lg:px-10 lg:py-10" style={{ backgroundColor: "color-mix(in oklab, var(--card) 92%, var(--background))" }}>
        <div
          className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full opacity-20 blur-3xl"
          style={{ background: "var(--gradient-primary)" }}
          aria-hidden="true"
        />
        <div className="relative grid items-center gap-7 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
          <div className="min-w-0">
            <div className="flex flex-col items-start">
              <Wordmark size="clamp(2.6rem, 9vw, 3.6rem)" />
              <span className="mt-1 text-sm font-bold tracking-tight text-foreground sm:text-base">GetPerfectBoy.com</span>
            </div>

            <h1 className="mt-4 max-w-[15ch] text-[2rem] font-black leading-[1.06] tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Show it. <span className="text-gradient-hero">We'll handle the rest.</span>
            </h1>
            <p className="mt-2.5 max-w-[46ch] text-sm text-muted-foreground">
              Show GPB a photo, video or description and we'll route you to the right service.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void navigate({ to: "/search", search: { q: service.trim(), loc: location.trim() } });
              }}
              className="mt-5 grid gap-2 rounded-[20px] border border-border/60 bg-card p-2 shadow-lg sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto] sm:gap-2.5 sm:rounded-full sm:p-2"
            >
              <div className="min-w-0">
              <LocationAutocomplete
                value={location}
                onChange={setLocation}
                aria-label="Location"
                placeholder="ZIP or city"
              />
              </div>
              <label className="flex min-w-0 items-center gap-2 rounded-xl bg-muted/50 px-4 py-3 sm:rounded-full">
                <Search className="h-4 w-4 shrink-0 text-primary" />
                <input
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  placeholder="What do you need?"
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </label>
              <GradientButton type="submit" className="w-full shrink-0 whitespace-nowrap px-5 sm:w-auto">
                Search <ArrowRight className="h-4 w-4" />
              </GradientButton>
            </form>

            <Link
              to="/snap"
              className="pulse-soft mt-4 inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-black text-white shadow-lg transition-transform hover:scale-[1.02]"
              style={{ background: "var(--gradient-primary)" }}
            >
              <Camera className="h-5 w-5" /> Show GPB
            </Link>
          </div>

          {/* Camera-first visual */}
          <div className="relative mx-auto w-full max-w-[300px] lg:max-w-[340px]">
            <div className="relative overflow-hidden rounded-[30px] border-[6px] border-foreground/85 bg-foreground/85 shadow-[var(--shadow-elevated)]">
              <div className="relative aspect-[9/14] w-full overflow-hidden rounded-[24px] bg-muted">
                <img
                  src={heroProblem}
                  alt="Framing a leaking pipe under a sink with the GPB camera"
                  className="h-full w-full object-cover"
                  fetchPriority="high"
                />
                <div className="scan-sweep" aria-hidden="true" />
                {/* viewfinder corners */}
                <div className="pointer-events-none absolute inset-6 rounded-2xl border-2 border-white/70" aria-hidden="true" />
                <div className="absolute inset-x-3 bottom-3">
                  <div className="glass-strong flex items-center gap-2 rounded-2xl px-3 py-2">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-white" style={{ background: "var(--gradient-primary)" }}>
                      <Sparkles className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 text-[11px] font-bold text-foreground">GPB is reading the scene…</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI journey */}
      <section className="mt-5">
        <AiJourneyStrip />
      </section>

      {/* Walking pros runway sitting directly above the category row */}
      <ProsOnTheMove slim />

      {/* Quick categories */}
      <section className="mt-3">
        <CategoryIconRow />
      </section>

      {/* Compact discovery rows */}
      <HomeRows />

      <EmergencyStrip />
      <ProviderRecruitment />

      <Footer />
    </AppShell>
  );
}

function EmergencyStrip() {
  const items = [
    { label: "Burst pipe", icon: Droplet },
    { label: "No power", icon: Zap },
    { label: "No heat / AC", icon: Wind },
    { label: "Lockout", icon: Lock },
  ];
  return (
    <section className="mt-10 overflow-hidden rounded-[24px] border border-destructive/25 bg-card p-4 sm:p-5">
      <div className="grid gap-4 md:grid-cols-[1fr_1.1fr] md:items-center">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive px-2.5 py-1 text-[11px] font-black text-destructive-foreground">
            <ShieldAlert className="h-3.5 w-3.5" /> 24/7 Emergency
          </span>
          <h2 className="mt-2 text-lg font-black tracking-tight sm:text-xl">When it can't wait, flag it first.</h2>
          <Link to="/emergency" className="mt-3 inline-flex items-center gap-2 rounded-full bg-destructive px-5 py-2.5 text-sm font-bold text-destructive-foreground transition-transform hover:scale-[1.02]">
            Get emergency help <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {items.map((it) => (
            <Link
              key={it.label}
              to="/emergency"
              className="flex items-center gap-2 rounded-2xl border border-border/60 bg-background px-3 py-2.5 text-sm font-semibold transition-all hover:-translate-y-0.5 hover:shadow-sm"
            >
              <it.icon className="h-4 w-4 shrink-0 text-destructive" />
              <span className="truncate">{it.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProviderRecruitment() {
  return (
    <section className="mt-10 overflow-hidden rounded-[26px] px-5 py-8 text-white sm:px-8 md:py-10" style={{ background: "var(--gradient-primary)" }}>
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-center">
        <div className="min-w-0">
          <div className="mb-2 inline-flex rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold backdrop-blur">For professionals</div>
          <h2 className="text-2xl font-black tracking-tight md:text-3xl">Offer your services on GPB</h2>
          <p className="mt-2 max-w-xl text-sm text-white/90">
            {catalog.length} categories, {TOTAL_SERVICES}+ services. You get a clear, standardized job brief instead of a vague enquiry.
          </p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <Link
              to="/register"
              search={{ redirect: undefined, role: "provider" }}
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-primary shadow-lg transition-transform hover:scale-[1.02]"
            >
              Join as a Pro <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/provider-interest"
              className="inline-flex items-center gap-2 rounded-full border border-white/50 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/15"
            >
              Register interest
            </Link>
          </div>
        </div>
        <ul className="space-y-2 text-sm">
          {[
            "Free profile with your service ZIP and radius",
            "Standardized job scopes, not vague enquiries",
            "Set your own prices, availability and coverage",
          ].map((l) => (
            <li key={l} className="flex items-start gap-2 rounded-2xl bg-white/10 px-4 py-2.5 backdrop-blur">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {l}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  return (
    <footer className="mt-14 border-t border-border/60 pt-10 pb-6 text-sm text-muted-foreground">
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.4fr]">
        <div className="min-w-0">
          <Logo />
          <p className="mt-3 max-w-xs text-xs leading-relaxed">
            AI-powered services marketplace connecting customers with trusted local pros.
          </p>
          <div className="mt-4 flex items-center gap-2">
            {[Facebook, Instagram, Twitter, Youtube].map((Icon, i) => (
              <a key={i} href="#" aria-label="Social" className="grid h-9 w-9 place-items-center rounded-full border border-border/60 bg-card text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary">
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
        <FooterCol title="Company" links={["About", "Careers", "Press", "Blog"]} />
        <FooterCol title="Support" links={["Help center", "Contact", "Trust & safety", "Cancellation"]} />
        <div className="min-w-0">
          <div className="mb-3 text-xs font-bold uppercase tracking-wider text-foreground">Stay in the loop</div>
          <form
            onSubmit={(e) => { e.preventDefault(); if (email) { setSubscribed(true); setEmail(""); } }}
            className="flex min-w-0 overflow-hidden rounded-full border border-border/60 bg-card p-1 shadow-sm"
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="min-w-0 flex-1 bg-transparent px-3 text-xs outline-none placeholder:text-muted-foreground"
            />
            <button type="submit" className="shrink-0 rounded-full px-4 py-2 text-xs font-bold text-white" style={{ background: "var(--gradient-primary)" }}>
              {subscribed ? "Done" : "Subscribe"}
            </button>
          </form>
        </div>
      </div>
      <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-border/60 pt-6 text-xs md:flex-row md:items-center">
        <span>© {new Date().getFullYear()} GetPerfectBoy.com. All rights reserved.</span>
        <div className="flex flex-wrap gap-5"><a href="#">Privacy</a><a href="#">Terms</a><a href="#">Cookies</a><a href="#">Accessibility</a></div>
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
