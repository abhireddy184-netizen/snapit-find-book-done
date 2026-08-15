import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, CheckCircle2, AlertCircle, Loader2, MapPin } from "lucide-react";
import { AppShell, GradientButton } from "@/components/snapit/AppShell";
import { catalog, TOTAL_SERVICES } from "@/lib/catalog";
import { supabase } from "@/integrations/supabase/client";
import { lookupZip, useResolvedLocation } from "@/lib/us-zip";

export const Route = createFileRoute("/provider-interest")({
  head: () => ({
    meta: [
      { title: "Register your interest as a pro — GetPerfectBoy.com" },
      { name: "description", content: "Join the GPB provider interest list. Tell us your trade and ZIP code and we'll reach out as onboarding opens in your area." },
      { property: "og:title", content: "Register your interest as a pro — GetPerfectBoy.com" },
      { property: "og:description", content: "Tell GPB your trade and service ZIP to be contacted as pro onboarding opens near you." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProviderInterestPage,
});

function ProviderInterestPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [zip, setZip] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const resolved = useResolvedLocation(zip);
  const place = resolved.kind === "zip" ? resolved.place : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (fullName.trim().length < 2) return setError("Please enter your full name.");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Please enter a valid email address.");
    if (!/^\d{5}$/.test(zip.trim())) return setError("Please enter a valid 5-digit US ZIP code.");
    if (!categorySlug) return setError("Please choose the service you offer.");
    if (note.length > 1000) return setError("Please keep your note under 1000 characters.");

    const category = catalog.find((c) => c.slug === categorySlug);
    setBusy(true);
    // Resolve directly so a slow first dataset load can't fail a valid ZIP.
    const resolvedPlace = place ?? (await lookupZip(zip.trim()));
    if (!resolvedPlace) {
      setBusy(false);
      return setError(`${zip.trim()} isn’t a recognized US ZIP code.`);
    }
    const { error: insertError } = await supabase.from("provider_interest").insert({
      full_name: fullName.trim().slice(0, 120),
      email: email.trim().slice(0, 255),
      phone: phone.trim() ? phone.trim().slice(0, 40) : null,
      zip: zip.trim(),
      city: resolvedPlace.city.slice(0, 120),
      state: resolvedPlace.state.slice(0, 2),
      category_slug: categorySlug,
      category_label: category?.name.slice(0, 160) ?? "",
      business_name: businessName.trim() ? businessName.trim().slice(0, 160) : null,
      note: note.trim() ? note.trim().slice(0, 1000) : null,
    });
    setBusy(false);
    if (insertError) {
      setError("We couldn’t submit that just now. Please try again in a moment.");
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <AppShell>
        <div className="mx-auto max-w-lg py-16 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full text-white shadow-lg" style={{ background: "var(--gradient-primary)" }}>
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h1 className="mt-6 text-3xl font-black">You’re on the list</h1>
          <p className="mt-3 text-muted-foreground">
            You’re on the GPB provider interest list. We’ll contact you as onboarding opens in your area.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            This isn’t an approval or a verification — it just tells us where to open next.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link to="/" className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold hover:bg-muted">Back to home</Link>
            <Link
              to="/register"
              search={{ redirect: undefined, role: "provider" }}
              className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white shadow-md"
              style={{ background: "var(--gradient-primary)" }}
            >
              Create a pro account <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="grid gap-8 py-6 lg:grid-cols-[1.1fr_1fr] lg:items-start">
        <div>
          <div className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">For professionals</div>
          <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">Register your interest</h1>
          <p className="mt-4 max-w-lg text-muted-foreground">
            GPB is onboarding professionals across the USA, across {catalog.length} service categories and {TOTAL_SERVICES}+ services.
            Tell us your trade and where you work, and we’ll be in touch as onboarding opens near you.
          </p>
          <ul className="mt-6 space-y-2 text-sm">
            {[
              "Standardized job briefs instead of vague enquiries",
              "You set your own prices and availability",
              "Before & after proof recorded on every job",
              "No listing fee to register interest",
            ].map((l) => (
              <li key={l} className="flex items-start gap-2 rounded-2xl border border-border/60 bg-card px-4 py-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {l}
              </li>
            ))}
          </ul>
        </div>

        <form onSubmit={submit} className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Full name" value={fullName} onChange={setFullName} placeholder="Jamie Rivera" required />
            <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" required />
            <Field label="Phone (optional)" value={phone} onChange={setPhone} placeholder="(555) 010-1234" />
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Service ZIP code</span>
              <LocationAutocomplete
                mode="zip"
                value={zip}
                onChange={setZip}
                required
                aria-label="Service ZIP code"
                placeholder="75034"
                showIcon={false}
                className="mt-1"
                fieldClassName="rounded-xl border border-border bg-background px-3 py-2.5 focus-within:border-primary"
              />
              {place && (
                <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                  <MapPin className="h-3 w-3" /> {place.city}, {place.state}
                </p>
              )}
              {resolved.kind === "invalid-zip" && (
                <p className="mt-1 text-xs font-medium text-destructive">{resolved.message}</p>
              )}
            </div>
          </div>

          <label className="mt-3 block">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Service you offer</span>
            <select
              value={categorySlug}
              onChange={(e) => setCategorySlug(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
            >
              <option value="">Choose a category</option>
              {catalog.map((c) => (
                <option key={c.slug} value={c.slug}>{c.name}</option>
              ))}
            </select>
          </label>

          <div className="mt-3">
            <Field label="Business name (optional)" value={businessName} onChange={setBusinessName} placeholder="Rivera Plumbing Co." />
          </div>

          <label className="mt-3 block">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Anything else (optional)</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 1000))}
              rows={4}
              maxLength={1000}
              placeholder="Years of experience, areas you cover, licensing…"
              className="mt-1 w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-primary"
            />
          </label>

          {error && (
            <p className="mt-3 inline-flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}
            </p>
          )}

          <div className="mt-5">
            <GradientButton type="submit" disabled={busy} className="w-full">
              {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</> : <>Register your interest <ArrowRight className="h-4 w-4" /></>}
            </GradientButton>
          </div>
          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            Registering interest does not create an account, approval or verification.
          </p>
        </form>
      </div>
    </AppShell>
  );
}

function Field({
  label, value, onChange, placeholder, type = "text", required,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        required={required ?? false}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? ""}
        className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}
