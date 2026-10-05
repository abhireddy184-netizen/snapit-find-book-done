import { ORGANIZATION_JSONLD } from "@/lib/brand";
import { SITE_URL } from "@/lib/brand";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { subscribeToUpdates } from "@/lib/subscribe.functions";
import {
  ArrowRight, Briefcase, Camera, CheckCircle2, ShieldAlert, Zap, Droplet, Wind, Lock,
} from "lucide-react";
import { AppShell } from "@/components/getpros/AppShell";
import { Logo } from "@/components/getpros/Logo";
import { EarlyAccessSection } from "@/components/getpros/EarlyAccess";
import { OutcomeComposer } from "@/components/getpros/OutcomeComposer";
import {
  ShowGpbBand, BrowseFallback, HowGpbWorksDetails,
} from "@/components/getpros/V2Sections";
import { ServiceShowcase } from "@/components/getpros/ServiceShowcase";




import { catalog, TOTAL_SERVICES } from "@/lib/catalog";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GetPros.ai — Show, Say or Type the Service You Need" },
      { name: "description", content: "Show GP a photo, speak it in any language, or type it. We work out the service you need and find a local pro — home, cleaning, repairs, moving, errands and auto." },
      { property: "og:title", content: "GetPros.ai — Show, Say or Type the Service You Need" },
      { property: "og:site_name", content: "GetPros.ai" },
      { property: "og:image", content: SITE_URL + "/brand/og-getpros.jpg?v=gp7" },
      { name: "twitter:image", content: SITE_URL + "/brand/og-getpros.jpg?v=gp7" },
      { property: "og:description", content: "Show, say or type what you need. GetPros finds the right local pro." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "GetPros.ai — Show, Say or Type the Service You Need" },
      { name: "twitter:description", content: "Show, say or type what you need. GetPros finds the right local pro." },
    ],
    scripts: [ORGANIZATION_JSONLD],
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
              Show it. Get matched. Book — no account needed to start.
            </p>


            {/* Camera-first: primary photo CTA on every screen size. */}
            <Link
              to="/snap"
              id="hero-show-gpb-cta"
              data-analytics-id="show_gpb_cta"
              data-analytics-location="hero_primary"
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-base font-bold text-white shadow-elevated transition-transform duration-200 hover:scale-[1.01] sm:w-auto sm:text-sm"
              style={{ background: "var(--gradient-primary)" }}
            >
              <Camera className="h-5 w-5" /> Show GP the problem
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
                to="/register"
                search={{ redirect: undefined, role: "provider" }}
                id="hero-provider-interest-cta"
                data-analytics-id="provider_signup_cta"
                data-analytics-location="hero"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full border-2 border-primary/70 bg-card px-4 py-2 text-sm font-bold text-primary shadow-sm transition-colors hover:border-primary hover:bg-primary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Briefcase className="h-4 w-4" /> Join as a Pro
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
              to="/register"
              search={{ redirect: undefined, role: "provider" }}
              id="provider-recruitment-cta"
              data-analytics-id="provider_signup_cta"
              data-analytics-location="homepage_provider_section"
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-primary shadow-elevated transition-transform hover:scale-[1.01]"
            >
              Join as a Pro <ArrowRight className="h-4 w-4" />
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



export { Footer } from "@/components/getpros/SiteFooter";
