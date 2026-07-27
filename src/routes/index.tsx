import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { MapPin, Search, Star, ShieldCheck, Clock, Sparkles, ArrowRight, CheckCircle2, Camera, ShieldAlert, Zap, Droplet, Wind, Lock } from "lucide-react";
import { AppShell, Avatar, GradientButton } from "@/components/snapit/AppShell";
import { Logo } from "@/components/snapit/Logo";
import { categories, providers, testimonials } from "@/lib/snapit-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SnapIt — Trusted local services on demand" },
      { name: "description", content: "Snap it. Book it. Done. Find, compare and book vetted local pros for home and personal services." },
      { property: "og:title", content: "SnapIt — Trusted local services on demand" },
      { property: "og:description", content: "Snap it. Book it. Done. Book vetted local pros in minutes." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const [location, setLocation] = useState("");
  const [service, setService] = useState("");

  return (
    <AppShell>
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl px-6 py-12 md:px-12 md:py-20" style={{ background: "var(--gradient-soft)" }}>
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-30 blur-3xl" style={{ background: "var(--gradient-primary)" }} />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full opacity-20 blur-3xl" style={{ background: "var(--gradient-primary)" }} />
        <div className="relative">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-primary shadow-sm backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" /> Snap it. Book it. Done.
          </div>
          <h1 className="max-w-3xl text-4xl font-black tracking-tight text-foreground md:text-6xl">
            Trusted local services,{" "}
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-primary)" }}>
              right when you need them.
            </span>
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted-foreground md:text-lg">
            Find, compare and book vetted local professionals for everything from plumbing emergencies to a fresh haircut — all in one place.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              navigate({ to: "/search", search: { q: service, loc: location } as never });
            }}
            className="mt-8 grid gap-3 rounded-2xl bg-white p-3 shadow-xl md:grid-cols-[1.2fr_1.5fr_auto]"
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
            <span className="inline-flex items-center gap-1.5"><Star className="h-4 w-4 text-primary" /> 5-star pros</span>
            <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4 text-primary" /> Same-day bookings</span>
          </div>
        </div>
      </section>

      {/* Popular categories */}
      <section className="mt-14">
        <SectionHeader title="Popular services" cta={{ label: "View all", to: "/categories" }} />
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {categories.slice(0, 10).map((cat) => {
            const Icon = cat.icon;
            return (
              <Link
                key={cat.slug}
                to="/search"
                search={{ cat: cat.slug } as never}
                className="group rounded-2xl border border-border/60 bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
              >
                <div className={`grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${cat.color} text-white shadow-md`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="mt-3 text-sm font-semibold text-foreground">{cat.name}</div>
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
            <div key={s.n} className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
              <div className="text-4xl font-black text-transparent bg-clip-text" style={{ backgroundImage: "var(--gradient-primary)" }}>{s.n}</div>
              <h3 className="mt-2 text-lg font-bold">{s.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured pros */}
      <section className="mt-16">
        <SectionHeader title="Featured professionals" cta={{ label: "Browse all", to: "/search" }} />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {providers.slice(0, 3).map((p) => (
            <Link
              key={p.id}
              to="/provider/$id"
              params={{ id: p.id }}
              className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="flex items-center gap-3">
                <Avatar initials={p.initials} gradient={p.gradient} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <div className="truncate font-bold">{p.name}</div>
                    {p.verified && <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{p.business}</div>
                </div>
              </div>
              <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>
              <div className="mt-4 flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {p.rating}
                  <span className="font-normal text-muted-foreground">({p.reviews})</span>
                </span>
                <span className="font-semibold text-primary">from ${p.startingPrice}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Reviews */}
      <section className="mt-16">
        <SectionHeader title="Loved by thousands of customers" />
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {testimonials.map((t) => (
            <div key={t.name} className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
              <div className="flex gap-0.5">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="mt-3 text-sm text-foreground">"{t.text}"</p>
              <div className="mt-4 text-xs font-semibold">{t.name} <span className="font-normal text-muted-foreground">· {t.role}</span></div>
            </div>
          ))}
        </div>
      </section>

      {/* Emergency Services */}
      <EmergencySection />

      {/* Become a provider */}
      <section className="mt-16 overflow-hidden rounded-3xl px-6 py-12 text-white md:px-12 md:py-16" style={{ background: "var(--gradient-primary)" }}>
        <div className="grid gap-6 md:grid-cols-[1.4fr_1fr] md:items-center">
          <div>
            <div className="mb-3 inline-flex rounded-full bg-white/20 px-3 py-1 text-xs font-medium backdrop-blur">For pros</div>
            <h2 className="text-3xl font-black md:text-4xl">Grow your business with SnapIt</h2>
            <p className="mt-3 max-w-xl text-white/90">Get matched with local customers who need you today. Zero setup fees, transparent payouts and tools that make running your business easier.</p>
            <div className="mt-6">
              <Link
                to="/register"
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

      <Footer />
      <FloatingSnapButton />
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
    <section className="mt-16 overflow-hidden rounded-3xl border border-red-200 bg-gradient-to-br from-red-50 via-white to-orange-50 p-6 md:p-10">
      <div className="grid gap-6 md:grid-cols-[1.2fr_1fr] md:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white">
            <ShieldAlert className="h-3.5 w-3.5" /> 24/7 Emergency
          </div>
          <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
            When it can't wait,{" "}
            <span className="text-red-600">we dispatch fast.</span>
          </h2>
          <p className="mt-2 max-w-lg text-sm text-muted-foreground md:text-base">
            On-call verified pros for burst pipes, power outages, lockouts and more. Average arrival under 20 minutes.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              to="/emergency"
              className="inline-flex items-center gap-2 rounded-full bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-lg hover:bg-red-700"
            >
              <ShieldAlert className="h-4 w-4" /> Get emergency help
            </Link>
            <Link
              to="/snap"
              className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-white px-5 py-3 text-sm font-semibold text-red-700 hover:bg-red-50"
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
              className="group flex items-center gap-3 rounded-2xl border border-red-100 bg-white p-3 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all"
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

function FloatingSnapButton() {
  return (
    <Link
      to="/snap"
      aria-label="Snap a problem for AI diagnosis"
      className="fixed bottom-24 right-4 z-50 flex items-center gap-2 rounded-full py-3.5 pl-4 pr-5 text-sm font-bold text-white shadow-2xl transition-transform hover:scale-105 active:scale-95 md:bottom-6 md:right-6"
      style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-elegant)" }}
    >
      <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
        <span className="absolute inset-0 animate-ping rounded-full bg-white/30" />
        <Camera className="relative h-5 w-5" />
      </span>
      <span className="hidden xs:inline">Snap a Problem</span>
      <span className="xs:hidden">Snap</span>
      <span className="ml-1 hidden items-center gap-1 rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider sm:inline-flex">
        <Sparkles className="h-3 w-3" /> AI
      </span>
    </Link>
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

export function Footer() {
  return (
    <footer className="mt-20 border-t border-border/60 pt-10 pb-6 text-sm text-muted-foreground">
      <div className="grid gap-8 md:grid-cols-4">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs">Snap it. Book it. Done. Local services made effortless.</p>
        </div>
        <FooterCol title="Company" links={["About", "Careers", "Press", "Blog"]} />
        <FooterCol title="Support" links={["Help center", "Contact", "Trust & safety", "Cancellation"]} />
        <FooterCol title="For providers" links={["Become a pro", "Provider hub", "Community", "Resources"]} />
      </div>
      <div className="mt-10 flex flex-col items-start justify-between gap-2 border-t border-border/60 pt-6 text-xs md:flex-row md:items-center">
        <span>© {new Date().getFullYear()} SnapIt. All rights reserved.</span>
        <div className="flex gap-4"><span>Privacy</span><span>Terms</span><span>Cookies</span></div>
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
