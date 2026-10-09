import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ArrowRight, CheckCircle2, AlertCircle, Loader2, MapPin, Search, ShieldCheck } from "lucide-react";
import { AppShell, GradientButton } from "@/components/getpros/AppShell";
import { LocationAutocomplete } from "@/components/getpros/LocationAutocomplete";
import { catalog, TOTAL_SERVICES } from "@/lib/catalog";
import { registerProviderInterest } from "@/lib/provider-interest.functions";
import { lookupZip, useResolvedLocation } from "@/lib/us-zip";

export const Route = createFileRoute("/provider-interest")({
  head: () => ({
    meta: [
      { title: "Grow your business with GetPros — GetPros.ai" },
      { name: "description", content: "Join GetPros as a Pro in 30 seconds. Free to join, set your own prices and choose when you work." },
      { property: "og:title", content: "Grow your business with GetPros — GetPros.ai" },
      { property: "og:description", content: "Join GetPros as a Pro in 30 seconds. Free to join, set your own prices and choose when you work." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Grow your business with GetPros — GetPros.ai" },
      { name: "twitter:description", content: "Join GetPros as a Pro in 30 seconds. Free to join, set your own prices and choose when you work." },
    ],
  }),
  component: ProviderInterestPage,
});

const ATTR_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid"] as const;
const TOP_COUNT = 8;
const NOTE_MAX = 500;
const STEPS = ["What service do you provide?", "Where do you work?", "How can we reach you?", "Tell us about your business"];
const BENEFITS = ["Free to join", "Set your own prices", "Choose your availability", "Clear job details before you accept"];

function ProviderInterestPage() {
  const [step, setStep] = useState(0);
  const [categorySlug, setCategorySlug] = useState("");
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [zip, setZip] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [years, setYears] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [attribution, setAttribution] = useState<Record<string, string>>({});
  const topRef = useRef<HTMLDivElement>(null);

  const submitInterest = useServerFn(registerProviderInterest);
  const resolved = useResolvedLocation(zip);
  const place = resolved.kind === "zip" ? resolved.place : null;
  const category = catalog.find((c) => c.slug === categorySlug);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const out: Record<string, string> = {};
    for (const k of ATTR_KEYS) {
      const v = params.get(k);
      if (v) out[k] = v.slice(0, 255);
    }
    setAttribution(out);
  }, []);

  const visibleCategories = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q) {
      return catalog.filter(
        (c) => c.name.toLowerCase().includes(q) || c.services.some((s) => s.name.toLowerCase().includes(q)),
      );
    }
    return showAll ? catalog : catalog.slice(0, TOP_COUNT);
  }, [query, showAll]);

  function go(next: number) {
    setError(null);
    setStep(next);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function validateStep(): Promise<boolean> {
    if (step === 0 && !categorySlug) return fail("Please choose the service you provide.");
    if (step === 1) {
      if (!/^\d{5}$/.test(zip.trim())) return fail("Please enter a valid 5-digit US ZIP code.");
      const p = place ?? (await lookupZip(zip.trim()));
      if (!p) return fail(`${zip.trim()} isn’t a recognized US ZIP code.`);
    }
    if (step === 2) {
      if (fullName.trim().length < 2) return fail("Please enter your full name.");
      if (!/^\S+@\S+\.\S+$/.test(email.trim())) return fail("Please enter a valid email address.");
      if (phone.replace(/\D/g, "").length < 10) return fail("Please enter a valid phone number.");
    }
    if (step === 3 && years.trim() && !/^\d{1,2}$/.test(years.trim())) return fail("Years of experience must be a number from 0 to 80.");
    return true;
  }

  function fail(msg: string) {
    setError(msg);
    return false;
  }

  async function onContinue(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const ok = await validateStep();
    setBusy(false);
    if (!ok) return;
    if (step < 3) return go(step + 1);
    await submit();
  }

  async function submit() {
    setBusy(true);
    const resolvedPlace = place ?? (await lookupZip(zip.trim()));
    if (!resolvedPlace) {
      setBusy(false);
      setStep(1);
      return setError(`${zip.trim()} isn’t a recognized US ZIP code.`);
    }
    try {
      const result = await submitInterest({
        data: {
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          zip: zip.trim(),
          city: resolvedPlace.city,
          state: resolvedPlace.state,
          categorySlug,
          categoryLabel: category?.name ?? "",
          businessName: businessName.trim() || null,
          note: note.trim() || null,
          yearsExperience: years.trim() ? Number(years.trim()) : null,
          attribution,
        },
      });
      setEmailSent(result.emailDelivery === "sent");
      setDone(true);
      topRef.current?.scrollIntoView({ block: "start" });
    } catch {
      setError("We couldn’t submit that just now. Please try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <AppShell>
        <div ref={topRef} className="mx-auto max-w-lg px-1 py-12 text-center sm:py-16">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full text-primary-foreground shadow-elevated" style={{ background: "var(--primary)" }}>
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h1 className="mt-6 text-3xl font-black tracking-tight">You’re on the GetPros Pro list</h1>
          <p className="mt-3 text-muted-foreground">
            We’ll contact you as onboarding opens in your area.
            {emailSent ? " A confirmation email is on its way." : ""}
          </p>
          <div className="mt-6 surface-card p-5 text-left">
            <p className="text-sm font-bold">Next: create your free Pro account</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Use <span className="font-semibold text-primary break-all">{email.trim().toLowerCase()}</span> and we’ll carry these details into your business profile automatically.
            </p>
            <Link
              to="/register"
              search={{ redirect: undefined, role: "provider" }}
              className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-5 text-sm font-bold text-primary-foreground shadow-card"
              style={{ background: "var(--gradient-primary)" }}
            >
              Create a Pro account <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">This isn’t an approval or a verification — it tells us where to open next.</p>
          <Link to="/" className="mt-4 inline-block text-sm font-semibold text-muted-foreground underline-offset-4 hover:underline">Back to home</Link>
        </div>
      </AppShell>
    );
  }

  const optionalBlank = !businessName.trim() && !years.trim() && !note.trim();

  return (
    <AppShell>
      <div ref={topRef} className="grid scroll-mt-24 gap-6 py-4 sm:py-6 lg:grid-cols-[1fr_1.1fr] lg:items-start lg:gap-10">
        <div>
          <div className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">For professionals</div>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl md:text-5xl">Grow your business with GetPros</h1>
          <p className="mt-3 max-w-lg text-sm text-muted-foreground sm:text-base">
            Join local professionals across {TOTAL_SERVICES}+ services. Get clear job requests, set your own prices, and choose when you work.
          </p>
          <ul className="mt-4 grid grid-cols-2 gap-2 text-sm">
            {BENEFITS.map((l) => (
              <li key={l} className="flex items-start gap-2 surface-card px-3 py-2.5 text-xs font-semibold sm:text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {l}
              </li>
            ))}
          </ul>
        </div>

        <form onSubmit={onContinue} noValidate className="surface-card p-4 sm:p-6">
          <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
            <span aria-live="polite">Step {step + 1} of 4</span>
            {step === 3 && <span>Optional</span>}
          </div>
          <div className="mt-2 grid grid-cols-4 gap-1.5" aria-hidden>
            {STEPS.map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>
          <h2 className="mt-4 text-xl font-black tracking-tight sm:text-2xl">{STEPS[step]}</h2>

          <div className="mt-4">
            {step === 0 && (
              <div>
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Search services</span>
                  <div className="mt-1 flex items-center gap-2 rounded-xl border border-border bg-background px-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                    <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="e.g. plumbing, cleaning, HVAC"
                      className="min-h-12 w-full bg-transparent text-base outline-none sm:text-sm"
                    />
                  </div>
                </label>
                <div role="radiogroup" aria-label="Service category" className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
                  {visibleCategories.map((c) => {
                    const Icon = c.icon;
                    const selected = c.slug === categorySlug;
                    return (
                      <button
                        key={c.slug}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => { setCategorySlug(c.slug); setError(null); }}
                        className={`flex min-h-14 items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                          selected ? "border-primary bg-primary/10 text-primary" : "border-border bg-background hover:border-primary/50"
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="min-w-0 break-words leading-tight">{c.name}</span>
                      </button>
                    );
                  })}
                  {visibleCategories.length === 0 && (
                    <p className="col-span-full text-sm text-muted-foreground">No match — try another word or see all categories.</p>
                  )}
                </div>
                {!query.trim() && (
                  <button type="button" onClick={() => setShowAll((v) => !v)} className="mt-3 min-h-11 text-sm font-bold text-primary">
                    {showAll ? "Show fewer" : `See all ${catalog.length} categories`}
                  </button>
                )}
                {category && !visibleCategories.includes(category) && (
                  <p className="mt-2 text-xs font-semibold text-primary">Selected: {category.name}</p>
                )}
              </div>
            )}

            {step === 1 && (
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Service ZIP code</span>
                <LocationAutocomplete
                  mode="zip"
                  suppressInvalidMessage
                  value={zip}
                  onChange={setZip}
                  required
                  aria-label="Service ZIP code"
                  placeholder="75034"
                  showIcon={false}
                  className="mt-1"
                  fieldClassName="min-h-12 rounded-xl border border-border bg-background px-3 py-2.5 text-base sm:text-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20"
                />
                {place && (
                  <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                    <MapPin className="h-3.5 w-3.5" /> {place.city}, {place.state}
                  </p>
                )}
                {resolved.kind === "invalid-zip" && (
                  <p className="mt-2 text-xs font-medium text-destructive">{resolved.message}</p>
                )}
                <p className="mt-3 text-xs text-muted-foreground">Any US ZIP code. We use it to tell you when onboarding opens near you.</p>
              </div>
            )}

            {step === 2 && (
              <div className="grid gap-3">
                <Field label="Full name" value={fullName} onChange={setFullName} placeholder="Jamie Rivera" autoComplete="name" />
                <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" autoComplete="email" inputMode="email" />
                <Field label="Phone" type="tel" value={phone} onChange={setPhone} placeholder="(555) 010-1234" autoComplete="tel" inputMode="tel" />
                <p className="inline-flex items-start gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  We’ll only use this to contact you about GetPros onboarding.
                </p>
              </div>
            )}

            {step === 3 && (
              <div className="grid gap-3">
                <Field label="Business name (optional)" value={businessName} onChange={setBusinessName} placeholder="Rivera Plumbing Co." autoComplete="organization" />
                <Field label="Years of experience (optional)" value={years} onChange={(v) => setYears(v.replace(/\D/g, "").slice(0, 2))} placeholder="5" inputMode="numeric" />
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Short note (optional)</span>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX))}
                    rows={3}
                    maxLength={NOTE_MAX}
                    placeholder="Areas you cover, specialties…"
                    className="mt-1 w-full rounded-xl border border-border bg-background p-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 sm:text-sm"
                  />
                  <span className="mt-1 block text-right text-[11px] text-muted-foreground">{note.length}/{NOTE_MAX}</span>
                </label>
              </div>
            )}
          </div>

          {error && (
            <p role="alert" className="mt-3 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </p>
          )}

          <div className="mt-5 flex gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => go(step - 1)}
                disabled={busy}
                className="inline-flex min-h-12 items-center gap-1 rounded-full border border-border px-4 text-sm font-semibold hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
            )}
            <GradientButton type="submit" disabled={busy} className="min-h-12 flex-1">
              {busy ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> {step === 3 ? "Submitting…" : "Checking…"}</>
              ) : step === 3 ? (
                <>{optionalBlank ? "Skip & join GetPros as a Pro" : "Join GetPros as a Pro"} <ArrowRight className="h-4 w-4" /></>
              ) : (
                <>Continue <ArrowRight className="h-4 w-4" /></>
              )}
            </GradientButton>
          </div>
          {step === 3 && (
            <p className="mt-3 text-center text-xs font-semibold text-muted-foreground">
              Free to join • No listing fee — GetPros keeps 15% of each paid job • You choose your prices and availability
            </p>
          )}
        </form>
      </div>
    </AppShell>
  );
}

function Field({
  label, value, onChange, placeholder, type = "text", autoComplete, inputMode,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
  autoComplete?: string; inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        autoComplete={autoComplete ?? "off"}
        inputMode={inputMode ?? "text"}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? ""}
        className="mt-1 min-h-12 w-full rounded-xl border border-border bg-background px-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 sm:text-sm"
      />
    </label>
  );
}
