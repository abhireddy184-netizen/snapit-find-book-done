import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, CheckCircle2, AlertCircle, Loader2, MapPin, Camera, Sparkles } from "lucide-react";
import { LocationAutocomplete } from "@/components/snapit/LocationAutocomplete";
import { GradientButton } from "@/components/snapit/AppShell";
import { catalog } from "@/lib/catalog";
import { supabase } from "@/integrations/supabase/client";
import { lookupZip, useResolvedLocation } from "@/lib/us-zip";

/** Show GetPros callout — concise, mobile-first. */
export function ShowGpbCallout() {
  return (
    <section className="mt-10 overflow-hidden rounded-[24px] border border-border/60 bg-card p-5 shadow-sm sm:p-6">
      <div className="grid gap-4 md:grid-cols-[1.3fr_auto] md:items-center">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-black text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Not sure what you need?
          </span>
          <h2 className="mt-2 text-xl font-black tracking-tight sm:text-2xl">Show GetPros the problem.</h2>
          <p className="mt-2 max-w-[52ch] text-sm text-muted-foreground">
            Take a photo, record a short video, or just describe the job. GetPros helps identify the
            service you need — and what a fair scope looks like.
          </p>
        </div>
        <Link
          to="/snap"
          id="show-gpb-cta-section"
          data-analytics-id="show_gpb_cta"
          data-analytics-location="homepage_callout"
          className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-black text-white shadow-lg transition-transform hover:scale-[1.02]"
          style={{ background: "var(--gradient-primary)" }}
        >
          <Camera className="h-5 w-5" /> Show GetPros
        </Link>
      </div>
    </section>
  );
}

const ALL_SERVICE_OPTIONS = catalog.map((c) => c.name);

/** Customer early-access lead capture. */
export function EarlyAccessSection() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [loc, setLoc] = useState("");
  const [interest, setInterest] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const resolved = useResolvedLocation(loc);
  const place = resolved.kind === "zip" ? resolved.place : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (fullName.trim().length < 2) return setError("Please enter your full name.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setError("Please enter a valid email address.");
    if (loc.trim().length < 2) return setError("Please enter your city or ZIP code.");
    if (!interest) return setError("Please choose the service you're interested in.");

    setBusy(true);
    const normalized = email.trim().toLowerCase();
    const zip = /^\d{5}$/.test(loc.trim()) ? loc.trim() : null;
    // Resolve directly so a slow first dataset load still records city/state.
    const resolvedPlace = place ?? (zip ? await lookupZip(zip) : null);
    const { error: insertError } = await supabase.from("early_access").insert({
      full_name: fullName.trim().slice(0, 120),
      email: email.trim().slice(0, 255),
      email_normalized: normalized.slice(0, 255),
      location: loc.trim().slice(0, 160),
      city: resolvedPlace?.city.slice(0, 120) ?? null,
      state: resolvedPlace?.state.slice(0, 2) ?? null,
      zip,
      service_interest: interest.slice(0, 160),

      source: "homepage_early_access",
    });
    setBusy(false);
    if (insertError) {
      setError("We couldn’t submit that just now. Please try again in a moment.");
      return;
    }
    setDone(true);
  }

  return (
    <section id="early-access" className="mt-12 scroll-mt-24">
      <div className="overflow-hidden rounded-[26px] border border-border/60 bg-card p-5 shadow-sm sm:p-8">
        <div className="grid gap-7 lg:grid-cols-[1fr_1fr] lg:items-start">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/15 px-3 py-1 text-[11px] font-black text-secondary">
              <MapPin className="h-3.5 w-3.5" /> Launching city by city
            </span>
            <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">GetPros is launching city by city</h2>
            <p className="mt-3 max-w-[52ch] text-sm text-muted-foreground">
              Join early access and be first to know when trusted local pros are available near you.
              Coverage expands as verified professionals join GetPros in each area — not every service is
              live everywhere yet.
            </p>
            <ul className="mt-5 space-y-2 text-sm">
              {[
                "Early invite when GetPros opens in your area",
                "No payment and no membership — it's a free list",
                "Tell us the service you want first, so we prioritise it",
              ].map((l) => (
                <li key={l} className="flex items-start gap-2 rounded-2xl border border-border/60 bg-background px-4 py-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {l}
                </li>
              ))}
            </ul>
          </div>

          {done ? (
            <div className="rounded-3xl border border-border/60 bg-background p-6 text-center">
              <div
                className="mx-auto grid h-14 w-14 place-items-center rounded-full text-white shadow-lg"
                style={{ background: "var(--gradient-primary)" }}
              >
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-xl font-black">You’re on the early access list</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                We’ll email you as soon as GetPros opens in your area.
              </p>
              <Link
                to="/snap"
                className="mt-5 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white shadow-md"
                style={{ background: "var(--gradient-primary)" }}
              >
                <Camera className="h-4 w-4" /> Show GetPros a job now
              </Link>
            </div>
          ) : (
            <form
              id="early-access-form"
              data-analytics-id="early_access_form"
              onSubmit={submit}
              noValidate
              className="rounded-3xl border border-border/60 bg-background p-5 shadow-sm sm:p-6"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Full name" value={fullName} onChange={setFullName} placeholder="Jamie Rivera" />
                <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@email.com" />
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">City or ZIP</span>
                  <LocationAutocomplete
                    value={loc}
                    onChange={setLoc}
                    aria-label="City or ZIP code"
                    placeholder="Katy, TX or 77494"
                    showIcon={false}
                    className="mt-1"
                    fieldClassName="rounded-xl border border-border bg-card px-3 py-2.5 focus-within:border-primary"
                  />
                  {place && (
                    <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                      <MapPin className="h-3 w-3" /> {place.city}, {place.state}
                    </p>
                  )}
                </div>
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Service interested in</span>
                  <select
                    value={interest}
                    onChange={(e) => setInterest(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
                  >
                    <option value="">Choose a service</option>
                    {ALL_SERVICE_OPTIONS.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                    <option value="Not sure yet">Not sure yet</option>
                  </select>
                </label>
              </div>

              {error && (
                <p
                  role="alert"
                  className="mt-3 inline-flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive"
                >
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}
                </p>
              )}

              <div className="mt-5">
                <GradientButton type="submit" disabled={busy} className="w-full">
                  {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Joining…</> : <>Join Early Access <ArrowRight className="h-4 w-4" /></>}
                </GradientButton>
              </div>
              <p className="mt-3 text-center text-[11px] leading-relaxed text-muted-foreground">
                Free to join — this isn’t a paid membership and doesn’t create an account. We’ll only use
                your details to contact you about GetPros availability near you, and you can ask us to remove
                you at any time.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

function Field({
  label, value, onChange, placeholder, type = "text",
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? ""}
        className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}
