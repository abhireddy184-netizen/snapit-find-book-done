import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Camera, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { AppShell, Avatar, GradientButton } from "@/components/snapit/AppShell";
import { providers } from "@/lib/snapit-data";

export const Route = createFileRoute("/book")({
  head: () => ({
    meta: [
      { title: "Book a service — SnapIt" },
      { name: "description", content: "Book a trusted local pro in a few taps." },
      { property: "og:title", content: "Book a service — SnapIt" },
      { property: "og:description", content: "Book a trusted local pro in a few taps." },
    ],
  }),
  component: BookPage,
});

const steps = ["Service", "Details", "Photos", "Address", "Schedule", "Review"];

function BookPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [service, setService] = useState("Leak repair");
  const [details, setDetails] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [address, setAddress] = useState("");
  const [date, setDate] = useState("Tomorrow");
  const [time, setTime] = useState("11:00 AM");
  const [confirmed, setConfirmed] = useState(false);

  const pro = providers[0];

  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const submit = () => {
    setConfirmed(true);
    setTimeout(() => navigate({ to: "/dashboard" }), 1600);
  };

  if (confirmed) {
    return (
      <AppShell hideBottomNav>
        <div className="mx-auto mt-16 max-w-md rounded-3xl border border-border/60 bg-card p-8 text-center shadow-lg">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full text-white shadow-lg" style={{ background: "var(--gradient-primary)" }}>
            <Check className="h-8 w-8" strokeWidth={3} />
          </div>
          <h1 className="mt-4 text-2xl font-black">Request sent!</h1>
          <p className="mt-2 text-sm text-muted-foreground">Your pro will confirm shortly. We'll notify you as soon as they do.</p>
        </div>
      </AppShell>
    );
  }

  const photoGrads = ["from-blue-500 to-purple-600", "from-indigo-500 to-violet-600", "from-purple-500 to-pink-500"];

  return (
    <AppShell hideBottomNav>
      <div className="mx-auto max-w-2xl pt-4">
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-semibold">Step {step + 1} of {steps.length}</span>
            <span>{steps[step]}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%`, background: "var(--gradient-primary)" }} />
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
          {step === 0 && (
            <StepWrap title="What do you need?" subtitle="Pick the service that best matches your job.">
              <div className="grid gap-2">
                {["Leak repair", "Drain unclog", "Water heater", "Toilet install", "Other"].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setService(opt)}
                    className={`flex items-center justify-between rounded-xl border p-4 text-left text-sm font-medium ${service === opt ? "border-primary bg-primary/5 text-primary" : "border-border bg-background"}`}
                  >
                    {opt}
                    {service === opt && <Check className="h-4 w-4" />}
                  </button>
                ))}
              </div>
            </StepWrap>
          )}

          {step === 1 && (
            <StepWrap title="Describe the problem" subtitle="The more details, the better the estimate.">
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={6}
                placeholder="e.g. Kitchen sink is leaking under the cabinet..."
                className="w-full rounded-xl border border-border bg-background p-4 text-sm outline-none focus:border-primary"
              />
            </StepWrap>
          )}

          {step === 2 && (
            <StepWrap title="Add photos" subtitle="Snap a few photos so the pro can prep the right tools.">
              <div className="grid grid-cols-3 gap-3">
                {photos.map((g, i) => (
                  <div key={i} className={`aspect-square rounded-xl bg-gradient-to-br ${g}`} />
                ))}
                <button
                  onClick={() => setPhotos((p) => [...p, photoGrads[p.length % photoGrads.length]])}
                  className="grid aspect-square place-items-center rounded-xl border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary"
                >
                  <div className="flex flex-col items-center gap-1 text-xs font-semibold">
                    <Camera className="h-5 w-5" />
                    Add
                  </div>
                </button>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Photos are optional but recommended.</p>
            </StepWrap>
          )}

          {step === 3 && (
            <StepWrap title="Service address" subtitle="Where should the pro meet you?">
              <label className="flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-3">
                <MapPin className="h-4 w-4 shrink-0 text-primary" />
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Main St, Springfield"
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                />
              </label>
              <div className="mt-3 rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
                Your exact address is only shared with the pro after they confirm.
              </div>
            </StepWrap>
          )}

          {step === 4 && (
            <StepWrap title="Pick date & time" subtitle="Choose what works best for you.">
              <div className="mb-4 flex flex-wrap gap-2">
                {["Today", "Tomorrow", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <button key={d} onClick={() => setDate(d)} className={`rounded-xl border px-4 py-2 text-sm font-semibold ${date === d ? "border-primary bg-primary text-white" : "border-border bg-background"}`}>
                    {d}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {["9:00 AM", "11:00 AM", "1:00 PM", "3:30 PM", "5:00 PM", "7:00 PM"].map((t) => (
                  <button key={t} onClick={() => setTime(t)} className={`rounded-full border px-3 py-2 text-xs font-semibold ${time === t ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </StepWrap>
          )}

          {step === 5 && (
            <StepWrap title="Review your request" subtitle="Confirm the details below to send it to your pro.">
              <div className="flex items-center gap-3 rounded-xl bg-muted/40 p-3">
                <Avatar initials={pro.initials} gradient={pro.gradient} />
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold">{pro.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{pro.business}</div>
                </div>
              </div>
              <dl className="mt-4 space-y-2 text-sm">
                <Row label="Service" value={service} />
                <Row label="Details" value={details || "—"} />
                <Row label="Photos" value={`${photos.length} attached`} />
                <Row label="Address" value={address || "—"} />
                <Row label="Date & time" value={`${date} · ${time}`} />
                <Row label="Estimated start" value={`$${pro.startingPrice}`} />
              </dl>
            </StepWrap>
          )}

          <div className="mt-8 flex items-center justify-between gap-3">
            <button
              onClick={back}
              disabled={step === 0}
              className="inline-flex items-center gap-1 rounded-full border border-border px-4 py-2 text-sm font-semibold disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
            {step < steps.length - 1 ? (
              <GradientButton onClick={next}>Continue <ChevronRight className="h-4 w-4" /></GradientButton>
            ) : (
              <GradientButton onClick={submit}>Confirm request <Check className="h-4 w-4" /></GradientButton>
            )}
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-muted-foreground">
          Need help? <Link to="/" className="font-semibold text-primary">Contact support</Link>
        </div>
      </div>
    </AppShell>
  );
}

function StepWrap({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xl font-black">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-3 border-b border-border/60 pb-2">
      <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="truncate text-sm text-foreground">{value}</dd>
    </div>
  );
}