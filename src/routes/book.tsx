import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check, Camera, ChevronLeft, ChevronRight, MapPin, Loader2 } from "lucide-react";
import { AppShell, Avatar, GradientButton } from "@/components/snapit/AppShell";
import { providers, getProvider } from "@/lib/snapit-data";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { BOOKING_DRAFT_KEY } from "@/lib/bookings";
import {
  DEFAULT_DURATION_MINUTES,
  DEFAULT_TRAVEL_BUFFER_MINUTES,
  addDaysIso,
  formatSlot,
  resolveServiceLocation,
  slotsForDate,
  todayInZone,
  zonedTimeToUtc,
  type ServiceLocation,
} from "@/lib/service-hours";

type BookingDraft = {
  service: string;
  details: string;
  address: string;
  date: string;
  time: string;
  providerId?: string;
};

/** Total minutes we must fit inside the 8:00 AM–8:00 PM local service window. */
const TOTAL_MINUTES = DEFAULT_DURATION_MINUTES + DEFAULT_TRAVEL_BUFFER_MINUTES;
/** Customers can't book a pro for right now — give everyone lead time. */
const LEAD_TIME_MINUTES = 120;

function dayLabel(isoDate: string, today: string): string {
  if (isoDate === today) return "Today";
  if (isoDate === addDaysIso(today, 1)) return "Tomorrow";
  return new Date(`${isoDate}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", timeZone: "UTC",
  });
}

type BookSearch = { provider?: string; job?: string; service?: string; pro?: string };

export const Route = createFileRoute("/book")({
  validateSearch: (search: Record<string, unknown>): BookSearch => ({
    provider: typeof search['provider'] === "string" ? (search['provider'] as string) : undefined,
    job: typeof search['job'] === "string" ? (search['job'] as string) : undefined,
    service: typeof search['service'] === "string" ? (search['service'] as string) : undefined,
    pro: typeof search['pro'] === "string" ? (search['pro'] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Book a service — GPB" },
      { name: "description", content: "Book a trusted local pro in a few taps." },
      { property: "og:title", content: "Book a service — GPB" },
      { property: "og:description", content: "Book a trusted local pro in a few taps." },
    ],
  }),
  component: BookPage,
});

const steps = ["Service", "Details", "Photos", "Address", "Schedule", "Review"];

function BookPage() {
  const navigate = useNavigate();
  const { provider: providerParam, job: jobId, service: serviceParam, pro: proParam } = Route.useSearch();
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState(0);
  const [service, setService] = useState(serviceParam || "Leak repair");
  const [details, setDetails] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [address, setAddress] = useState("");
  const [location, setLocation] = useState<ServiceLocation | null>(null);
  const [dateIso, setDateIso] = useState<string | null>(null);
  const [slotMinute, setSlotMinute] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pro = (providerParam ? getProvider(providerParam) : undefined) ?? providers[0];
  const proName = proParam || pro.name;

  // Restore a draft saved when a guest was sent to sign in.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(BOOKING_DRAFT_KEY);
    if (!raw) return;
    window.localStorage.removeItem(BOOKING_DRAFT_KEY);
    try {
      const draft = JSON.parse(raw) as BookingDraft;
      if (draft.service) setService(draft.service);
      if (draft.details) setDetails(draft.details);
      if (draft.address) setAddress(draft.address);
      if (draft.date) setDateIso(draft.date);
      if (draft.time) setSlotMinute(Number(draft.time) || null);
      setStep(steps.length - 1);
    } catch {
      /* ignore malformed draft */
    }
  }, []);

  // The service address decides the timezone — never the customer's device.
  // A pro in Frisco works 8–8 Central even if the phone is set to Tokyo.
  useEffect(() => {
    let cancelled = false;
    const value = address.trim();
    if (!value) { setLocation(null); return; }
    void resolveServiceLocation(value).then((loc) => {
      if (!cancelled) setLocation(loc);
    });
    return () => { cancelled = true; };
  }, [address]);

  const timeZone = location?.timeZone ?? null;
  const notBefore = useMemo(() => new Date(Date.now() + LEAD_TIME_MINUTES * 60_000), []);
  const today = timeZone ? todayInZone(timeZone, notBefore) : null;

  const days = useMemo(() => {
    if (!timeZone || !today) return [] as { iso: string; label: string; slots: number[] }[];
    return Array.from({ length: 7 }, (_, i) => {
      const iso = addDaysIso(today, i);
      return {
        iso,
        label: dayLabel(iso, today),
        slots: slotsForDate(iso, { totalMinutes: TOTAL_MINUTES, timeZone, notBefore }),
      };
    }).filter((d) => d.slots.length > 0);
  }, [timeZone, today, notBefore]);

  // Keep the selection valid whenever the address (and so the calendar) changes.
  useEffect(() => {
    if (days.length === 0) { setDateIso(null); setSlotMinute(null); return; }
    const current = days.find((d) => d.iso === dateIso) ?? days[0]!;
    if (current.iso !== dateIso) setDateIso(current.iso);
    if (slotMinute == null || !current.slots.includes(slotMinute)) setSlotMinute(current.slots[0]!);
  }, [days, dateIso, slotMinute]);

  const activeDay = days.find((d) => d.iso === dateIso) ?? null;
  const scheduleReady = Boolean(timeZone && dateIso && slotMinute != null);

  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const submit = async () => {
    setError(null);
    if (!address.trim()) {
      setError("Please add a service address before confirming.");
      setStep(3);
      return;
    }
    if (!location) {
      setError("Add a US ZIP code to your address so we can schedule in your local time.");
      setStep(3);
      return;
    }
    if (!dateIso || slotMinute == null) {
      setError("Pick a date and start time for your job.");
      setStep(4);
      return;
    }

    if (!user) {
      if (typeof window !== "undefined") {
        const draft: BookingDraft = {
          service, details, address, date: dateIso, time: String(slotMinute), providerId: pro.id,
        };
        window.localStorage.setItem(BOOKING_DRAFT_KEY, JSON.stringify(draft));
      }
      await navigate({ to: "/login", search: { redirect: "/book" } });
      return;
    }

    // Store the exact instant alongside the local wall time, so the job means
    // the same moment to the customer and the pro wherever each of them is.
    const startAt = zonedTimeToUtc(dateIso, slotMinute, location.timeZone);
    const endAt = new Date(startAt.getTime() + DEFAULT_DURATION_MINUTES * 60_000);
    const timeLabel = formatSlot(slotMinute);

    setSubmitting(true);
    const { error: insertError } = await supabase.from("bookings").insert({
      customer_id: user.id,
      provider_id: null,
      provider_name_snapshot: proName,
      job_id: jobId ?? null,
      service,
      details: details || null,
      service_address: address.trim(),
      scheduled_date: dateIso,
      scheduled_time: timeLabel,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      service_timezone: location.timeZone,
      status: "pending",
    });
    setSubmitting(false);

    if (insertError) {
      setError("We couldn't save your request. Please try again.");
      return;
    }

    if (jobId) {
      await supabase
        .from("service_requests")
        .update({
          status: "booked",
          service_address: address.trim(),
          preferred_date: dateIso,
          preferred_time: timeLabel,
        })
        .eq("id", jobId);
    }


    setConfirmed(true);
    setTimeout(() => {
      if (jobId) void navigate({ to: "/job/$id", params: { id: jobId } });
      else void navigate({ to: "/dashboard" });
    }, 1600);
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

  const photoGrads = ["from-[#FF3D8D] to-[#FF7A45]", "from-[#FFD83D] to-[#FF9E2C]", "from-[#4ED6A0] to-[#6EC8FF]"];

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
            <StepWrap
              title="Pick date & time"
              subtitle={
                location
                  ? `Times shown in ${location.city}, ${location.state} local time. GPB jobs run 8:00 AM–8:00 PM.`
                  : "Add a US ZIP code to your address and we'll show real local availability."
              }
            >
              {!location ? (
                <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                  We schedule in the service address's own timezone, so we need a US ZIP code first.
                  <button onClick={() => setStep(3)} className="ml-1 font-bold text-primary underline">
                    Add your address
                  </button>
                </div>
              ) : days.length === 0 ? (
                <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                  No openings in the next 7 days for a job this length. Try a different address or contact support.
                </div>
              ) : (
                <>
                  <div className="-mx-1 mb-4 flex snap-x gap-2 overflow-x-auto px-1 pb-1">
                    {days.map((d) => (
                      <button
                        key={d.iso}
                        onClick={() => { setDateIso(d.iso); setSlotMinute(d.slots[0]!); }}
                        className={`shrink-0 snap-start rounded-xl border px-4 py-2 text-sm font-semibold ${dateIso === d.iso ? "border-primary bg-primary text-white" : "border-border bg-background"}`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {(activeDay?.slots ?? []).map((m) => (
                      <button
                        key={m}
                        onClick={() => setSlotMinute(m)}
                        className={`rounded-full border px-3 py-2 text-xs font-semibold ${slotMinute === m ? "border-primary bg-primary/10 text-primary" : "border-border"}`}
                      >
                        {formatSlot(m)}
                      </button>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    We hold about {DEFAULT_DURATION_MINUTES} minutes for the job plus {DEFAULT_TRAVEL_BUFFER_MINUTES} minutes
                    of travel, and the earliest slot is {LEAD_TIME_MINUTES / 60} hours from now.
                  </p>
                </>
              )}
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
              <GradientButton onClick={() => void submit()} disabled={submitting || authLoading}>
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</> : <>Confirm request <Check className="h-4 w-4" /></>}
              </GradientButton>
            )}
          </div>

          {error && <p className="mt-4 text-center text-xs font-medium text-destructive">{error}</p>}
          {!user && !authLoading && (
            <p className="mt-3 text-center text-xs text-muted-foreground">You'll be asked to sign in to confirm — your request is saved.</p>
          )}
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