import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { subscribeToUpdates } from "@/lib/subscribe.functions";
import { LocationAutocomplete } from "@/components/snapit/LocationAutocomplete";
import {
  Search, ArrowRight, CheckCircle2, Camera, ShieldAlert, Zap, Droplet, Wind, Lock,
  Facebook, Instagram, Twitter, Youtube, Sparkles,
} from "lucide-react";
import { AppShell, GradientButton } from "@/components/snapit/AppShell";
import { Logo, Wordmark } from "@/components/snapit/Logo";
import { AiJourneyStrip, CategoryIconRow, HomeRows } from "@/components/snapit/HomeSections";
import { EarlyAccessSection, ShowGpbCallout } from "@/components/snapit/EarlyAccess";
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

            <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
              <a
                href="#early-access"
                id="hero-early-access-cta"
                data-analytics-id="early_access_cta"
                data-analytics-location="hero"
                className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-black text-white shadow-lg transition-transform hover:scale-[1.02]"
                style={{ background: "var(--gradient-primary)" }}
              >
                Get Early Access <ArrowRight className="h-4 w-4" />
              </a>
              <Link
                to="/provider-interest"
                id="hero-provider-interest-cta"
                data-analytics-id="provider_interest_cta"
                data-analytics-location="hero"
                className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-primary/40 bg-card px-6 py-3.5 text-sm font-black text-primary transition-colors hover:bg-primary/5"
              >
                Join GPB as a Pro
              </Link>
            </div>

            <Link
              to="/snap"
              id="hero-show-gpb-cta"
              data-analytics-id="show_gpb_cta"
              data-analytics-location="hero"
              className="mt-3.5 inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-5 py-3 text-sm font-bold text-foreground shadow-sm transition-transform hover:scale-[1.02]"
            >
              <Camera className="h-5 w-5 text-primary" />
              <span>Not sure what service you need? <span className="text-primary">Show GPB.</span></span>
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

      <ShowGpbCallout />
      <EmergencyStrip />
      <ProviderRecruitment />
      <EarlyAccessSection />

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
          <h2 className="text-2xl font-black tracking-tight md:text-3xl">Become a Founding Provider</h2>
          <p className="mt-2 max-w-xl text-sm text-white/90">
            {catalog.length} categories, {TOTAL_SERVICES}+ services. Register your interest before launch and
            you get a clear, standardized job brief instead of a vague enquiry.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2.5">
            <Link
              to="/provider-interest"
              id="provider-recruitment-cta"
              data-analytics-id="provider_interest_cta"
              data-analytics-location="homepage_provider_section"
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-primary shadow-lg transition-transform hover:scale-[1.02]"
            >
              Register Your Interest <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/register"
              search={{ redirect: undefined, role: "provider" }}
              className="text-sm font-semibold text-white/85 underline underline-offset-4 transition-colors hover:text-white"
            >
              Or create a full pro account
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
  const subscribe = useServerFn(subscribeToUpdates);
  const [state, setState] = useState<"idle" | "submitting" | "success" | "already" | "error">("idle");
  const [message, setMessage] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === "submitting") return;
    const value = email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
      setState("error");
      setMessage("Please enter a valid email address.");
      return;
    }
    setState("submitting");
    setMessage("");
    try {
      const res = await subscribe({ data: { email: value, source: "website_footer" } });
      if (res.status === "already_subscribed") {
        setState("already");
        setMessage("You're already subscribed — thanks for being with GPB.");
      } else {
        setState("success");
        setMessage(
          res.emailDelivery === "sent"
            ? "You're subscribed. Check your inbox for a welcome note."
            : "You're subscribed. We couldn't send the welcome email right now, but you're on the list.",
        );
        setEmail("");
      }
    } catch {
      setState("error");
      setMessage("We couldn't save your subscription. Please try again.");
    }
  };

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
        <div>
          <div className="mb-3 text-xs font-bold uppercase tracking-wider text-foreground">Get started</div>
          <ul className="space-y-2">
            <li>
              <a
                href="/#early-access"
                id="footer-early-access-link"
                data-analytics-id="early_access_cta"
                data-analytics-location="footer"
                className="font-semibold text-primary hover:underline"
              >
                Early Access
              </a>
            </li>
            <li>
              <Link
                to="/provider-interest"
                id="footer-for-pros-link"
                data-analytics-id="provider_interest_cta"
                data-analytics-location="footer"
                className="hover:text-foreground"
              >
                For Pros
              </Link>
            </li>
            <li><Link to="/snap" data-analytics-id="show_gpb_cta" data-analytics-location="footer" className="hover:text-foreground">Show GPB</Link></li>
            <li><Link to="/services" className="hover:text-foreground">All services</Link></li>
          </ul>
        </div>
        <FooterCol title="Support" links={["Help center", "Contact", "Trust & safety", "Cancellation"]} />
        <div className="min-w-0">
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-foreground">Newsletter</div>
          <p className="mb-3 text-[11px] leading-relaxed">
            General GPB news and new services — this is not the early access list.{" "}
            <a href="/#early-access" className="font-semibold text-primary hover:underline">Join early access</a> to
            be notified when pros go live near you. Unsubscribe anytime.
          </p>

          <form
            onSubmit={submit}
            noValidate
            className="flex min-w-0 overflow-hidden rounded-full border border-border/60 bg-card p-1 shadow-sm"
          >
            <label htmlFor="gpb-newsletter-email" className="sr-only">Email address for GPB updates</label>
            <input
              id="gpb-newsletter-email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (state !== "idle") { setState("idle"); setMessage(""); } }}
              autoComplete="email"
              aria-invalid={state === "error"}
              aria-describedby="gpb-newsletter-status"
              placeholder="you@email.com"
              className="min-w-0 flex-1 bg-transparent px-3 text-xs outline-none placeholder:text-muted-foreground"
            />
            <button
              type="submit"
              disabled={state === "submitting"}
              className="shrink-0 rounded-full px-4 py-2 text-xs font-bold text-white disabled:opacity-70"
              style={{ background: "var(--gradient-primary)" }}
            >
              {state === "submitting" ? "Subscribing…" : "Subscribe"}
            </button>
          </form>
          <p
            id="gpb-newsletter-status"
            role="status"
            aria-live="polite"
            className={`mt-2 min-h-[1rem] text-[11px] font-semibold ${state === "error" ? "text-destructive" : "text-foreground"}`}
          >
            {message}
          </p>
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
