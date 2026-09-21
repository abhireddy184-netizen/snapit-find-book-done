import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { subscribeToUpdates } from "@/lib/subscribe.functions";
import {
  ArrowRight, Camera, CheckCircle2, ShieldAlert, Zap, Droplet, Wind, Lock,
} from "lucide-react";
import { AppShell } from "@/components/snapit/AppShell";
import { Logo } from "@/components/snapit/Logo";
import { EarlyAccessSection } from "@/components/snapit/EarlyAccess";
import { OutcomeComposer } from "@/components/snapit/OutcomeComposer";
import {
  ShowGpbBand, BrowseFallback, HowGpbWorksDetails,
} from "@/components/snapit/V2Sections";
import { ServiceShowcase } from "@/components/snapit/ServiceShowcase";




import { catalog, TOTAL_SERVICES } from "@/lib/catalog";

const SITE_URL = "https://getpros.ai";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GetPros.ai — Show, Say or Type the Service You Need" },
      { name: "description", content: "Show GP a photo, speak it in any language, or type it. We work out the service you need and find a local pro — home, cleaning, repairs, moving, errands and auto." },
      { property: "og:title", content: "GetPros.ai — Show, Say or Type the Service You Need" },
      { property: "og:site_name", content: "GetPros.ai" },
      { property: "og:image", content: SITE_URL + "/brand/og-getpros.jpg?v=gp3" },
      { name: "twitter:image", content: SITE_URL + "/brand/og-getpros.jpg?v=gp3" },
      { property: "og:description", content: "Show, say or type what you need. GetPros finds the right local pro." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: SITE_URL + "/" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "GetPros.ai — Show, Say or Type the Service You Need" },
      { name: "twitter:description", content: "Show, say or type what you need. GetPros finds the right local pro." },
    ],
    links: [{ rel: "canonical", href: SITE_URL + "/" }],
  }),
  component: Landing,
});

function Landing() {
  return (
    <AppShell>
      {/* Hero — outcome-first composer. One clean surface: no gradient orbs,
          no mesh. The composer is the single action on phones. */}
      <section
        className="gpb-bleed fade-up relative -mt-4 overflow-hidden border-b border-border/50 py-10 sm:py-14 lg:py-20 xl:py-24 md:-mt-6"
        style={{ backgroundColor: "color-mix(in oklab, var(--card) 92%, var(--background))" }}
      >
        <div className="gpb-shell relative grid items-center gap-8 lg:grid-cols-[1fr_1fr] lg:gap-14 xl:gap-20">
          <div className="min-w-0">
            {/* Branding lives in the header only — repeating the wordmark here
                pushed the headline below the fold on phones. */}
            <h1 className="max-w-[14ch] text-[clamp(2.25rem,5.6vw,4.25rem)] font-extrabold leading-[1.02] tracking-[-0.04em] text-foreground">
              What do you <span className="text-gradient-hero">need?</span>
            </h1>
            <p className="mt-3 max-w-[36ch] text-[clamp(1rem,1.15vw,1.15rem)] leading-relaxed text-muted-foreground">
              Type it, say it, or show it — we’ll find the right pro.
            </p>


            {/* Desktop keeps a photo-first button because the composer sits in
                the second column; on phones the composer already carries it. */}
            <Link
              to="/snap"
              id="hero-show-gpb-cta"
              data-analytics-id="show_gpb_cta"
              data-analytics-location="hero_primary"
              className="mt-6 hidden items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-bold text-white shadow-elevated transition-transform duration-200 hover:scale-[1.01] lg:inline-flex"
              style={{ background: "var(--gradient-primary)" }}
            >
              <Camera className="h-5 w-5" /> Show GP a photo
            </Link>

            <div className="mt-5 lg:hidden">
              <OutcomeComposer />
            </div>



            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold text-muted-foreground">
              <a
                href="#early-access"
                id="hero-early-access-cta"
                data-analytics-id="early_access_cta"
                data-analytics-location="hero"
                className="text-primary hover:underline"
              >
                Get early access
              </a>
              <Link
                to="/provider-interest"
                id="hero-provider-interest-cta"
                data-analytics-id="provider_interest_cta"
                data-analytics-location="hero"
                className="hover:text-foreground hover:underline"
              >
                Join as a pro
              </Link>
            </div>
          </div>


          {/* Composer sits beside the headline on large screens */}
          <div className="hidden min-w-0 lg:block">
            <OutcomeComposer />
          </div>
        </div>
      </section>

      <ServiceShowcase />
      <ShowGpbBand />
      <BrowseFallback />
      <HowGpbWorksDetails />




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
    <section className="mt-8 overflow-hidden rounded-2xl border border-destructive/25 bg-card p-4 sm:p-5">
      <div className="grid gap-4 md:grid-cols-[1fr_1.1fr] md:items-center">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive px-2.5 py-1 text-xs font-black text-destructive-foreground">
            <ShieldAlert className="h-3.5 w-3.5" /> 24/7 Emergency
          </span>
          <h2 className="mt-2 text-lg font-black tracking-tight sm:text-xl">Can’t wait? Get help now.</h2>
          <Link to="/emergency" className="mt-3 inline-flex items-center gap-2 rounded-full bg-destructive px-5 py-2.5 text-sm font-bold text-destructive-foreground transition-transform hover:scale-[1.01]">
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
    <section className="mt-8 overflow-hidden rounded-2xl px-5 py-7 text-white sm:px-8 md:py-10" style={{ background: "var(--gradient-primary)" }}>
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-center">
        <div className="min-w-0">
          <div className="mb-2 inline-flex rounded-full bg-white/20 px-3 py-1 text-xs font-bold backdrop-blur">For pros</div>
          <h2 className="text-2xl font-black tracking-tight md:text-3xl">Clearer jobs. Less noise.</h2>
          <p className="mt-2 max-w-xl text-sm text-white/90">
            Customer requests arrive with scope and location already attached.
            {" "}{catalog.length} categories, {TOTAL_SERVICES}+ services.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2.5">
            <Link
              to="/provider-interest"
              id="provider-recruitment-cta"
              data-analytics-id="provider_interest_cta"
              data-analytics-location="homepage_provider_section"
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-primary shadow-elevated transition-transform hover:scale-[1.01]"
            >
              Register Interest <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/register"
              search={{ redirect: undefined, role: "provider" }}
              className="text-sm font-semibold text-white/85 underline underline-offset-4 transition-colors hover:text-white"
            >
              Create pro account
            </Link>
          </div>

        </div>
        <ul className="space-y-2 text-sm">
          {[
            "Free profile with ZIP and radius",
            "Only matching requests reach you",
            "Set your prices and availability",
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
        setMessage("You're already subscribed — thanks for being with GetPros.");
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
    <footer className="mt-12 border-t border-border/60 pt-10 pb-6 text-sm text-muted-foreground">
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.4fr]">
        <div className="min-w-0">
          <Logo showTagline />
          <p className="mt-3 max-w-xs text-xs leading-relaxed">
            Type, say, or show what you need. We find the right local pro.
          </p>
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
            <li><Link to="/snap" data-analytics-id="show_gpb_cta" data-analytics-location="footer" className="hover:text-foreground">Show GP</Link></li>
            <li><Link to="/services" className="hover:text-foreground">All services</Link></li>
          </ul>
        </div>
        <div>
          <div className="mb-3 text-xs font-bold uppercase tracking-wider text-foreground">Company</div>
          <ul className="space-y-2">
            <li><a href="/#how-it-works" className="hover:text-foreground">How it works</a></li>
            <li><Link to="/emergency" className="hover:text-foreground">Emergency services</Link></li>
            <li><Link to="/legal" hash="terms" className="hover:text-foreground">Trust &amp; safety</Link></li>
            <li><Link to="/legal" hash="privacy" className="hover:text-foreground">Privacy</Link></li>
          </ul>
        </div>

        <div className="min-w-0">
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-foreground">Newsletter</div>
          <p className="mb-3 text-xs leading-relaxed">
            GetPros news and new services.{" "}
            <a href="/#early-access" className="font-semibold text-primary hover:underline">Join early access</a> for launch alerts.
          </p>

          <form
            onSubmit={submit}
            noValidate
            className="flex min-w-0 overflow-hidden rounded-full border border-border/60 bg-card p-1 shadow-sm"
          >
            <label htmlFor="gpb-newsletter-email" className="sr-only">Email address for GetPros updates</label>
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
            className={`mt-2 min-h-[1rem] text-xs font-semibold ${state === "error" ? "text-destructive" : "text-foreground"}`}
          >
            {message}
          </p>
        </div>
      </div>
      <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-border/60 pt-6 text-xs md:flex-row md:items-center">
        <span>© {new Date().getFullYear()} GetPros.ai. All rights reserved.</span>
        <div className="flex flex-wrap gap-5">
          <Link to="/legal" hash="privacy" className="hover:text-foreground">Privacy</Link>
          <Link to="/legal" hash="terms" className="hover:text-foreground">Terms</Link>
          <Link to="/legal" hash="cookies" className="hover:text-foreground">Cookies</Link>
          <Link to="/legal" hash="accessibility" className="hover:text-foreground">Accessibility</Link>
          <Link to="/categories" className="hover:text-foreground">All categories</Link>
        </div>
      </div>
    </footer>
  );
}

