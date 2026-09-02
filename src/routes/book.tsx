import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, MapPin, Loader2, ShieldCheck, AlertTriangle } from "lucide-react";
import { AppShell, Avatar, GradientButton } from "@/components/snapit/AppShell";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { BOOKING_DRAFT_KEY } from "@/lib/bookings";
import { catalog, getCategoryBySlug, type MasterCategory } from "@/lib/catalog";
import { fetchProviderByUserId, isBookable, type PublicProvider } from "@/lib/providers";
import { fetchAvailability, fetchBusy } from "@/lib/schedule";
import type { WeeklyHours } from "@/lib/service-hours";
import {
  addDaysIso,
  formatSlot,
  LEAD_TIME_MINUTES,
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
  categorySlug?: string;
  jobId?: string;
};

function dayLabel(isoDate: string, today: string): string {
  if (isoDate === today) return "Today";
  if (isoDate === addDaysIso(today, 1)) return "Tomorrow";
  return new Date(`${isoDate}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", timeZone: "UTC",
  });
}

type BookSearch = { provider?: string; job?: string; service?: string; category?: string };

export const Route = createFileRoute("/book")({
  validateSearch: (search: Record<string, unknown>): BookSearch => ({
    provider: typeof search['provider'] === "string" ? (search['provider'] as string) : undefined,
    job: typeof search['job'] === "string" ? (search['job'] as string) : undefined,
    service: typeof search['service'] === "string" ? (search['service'] as string) : undefined,
    category: typeof search['category'] === "string" ? (search['category'] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Book a service — GetPros" },
      { name: "description", content: "Book a trusted local pro in a few taps." },
      { property: "og:title", content: "Book a service — GetPros" },
      { property: "og:description", content: "Book a trusted local pro in a few taps." },
    ],
  }),
  component: BookPage,
});

const steps = ["Service", "Details", "Address", "Schedule", "Review"];

/** Match a provider's stored category label to a catalog category. */
function categoryFor(provider: PublicProvider | null, slug?: string): MasterCategory | null {
  if (slug) {
    const hit = getCategoryBySlug(slug);
    if (hit) return hit;
  }
  const raw = provider?.service_category?.toLowerCase().trim();
  if (!raw) return null;
  return (
    catalog.find((c) => c.slug === raw || c.providerCategory === raw || c.name.toLowerCase() === raw) ?? null
  );
}

function BookPage() {
  const navigate = useNavigate();
  const { provider: providerParam, job: jobId, service: serviceParam, category: categoryParam } = Route.useSearch();
  const { user, loading: authLoading } = useAuth();

  const [step, setStep] = useState(0);
  const [provider, setProvider] = useState<PublicProvider | null>(null);
  const [providerState, setProviderState] = useState<"loading" | "ready" | "missing">(
    providerParam ? "loading" : "missing",
  );
  const [hours, setHours] = useState<WeeklyHours[] | null>(null);
  const [busy, setBusy] = useState<{ startAt: string; endAt: string }[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);

  const [service, setService] = useState(serviceParam || "");
  const [details, setDetails] = useState("");
  const [address, setAddress] = useState("");
  const [location, setLocation] = useState<ServiceLocation | null>(null);
  const [locationChecked, setLocationChecked] = useState(false);
  const [dateIso, setDateIso] = useState<string | null>(null);
  const [slotMinute, setSlotMinute] = useState<number | null>(null);
  const [slotWasReset, setSlotWasReset] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftCategory, setDraftCategory] = useState<string | undefined>(undefined);

  // Load the real pro this booking will be assigned to. There is no fallback:
  // a booking must name an actual GetPros professional's account.
  useEffect(() => {
    if (!providerParam) { setProviderState("missing"); return; }
    let cancelled = false;
    setProviderState("loading");
    void fetchProviderByUserId(providerParam)
      .then((p) => {
        if (cancelled) return;
        if (p && isBookable(p)) { setProvider(p); setProviderState("ready"); }
        else { setProvider(null); setProviderState("missing"); }
      })
      .catch(() => { if (!cancelled) setProviderState("missing"); });
    return () => { cancelled = true; };
  }, [providerParam]);

  // The pro's own weekly hours and busy ranges drive the calendar.
  useEffect(() => {
    if (!provider) { setHours(null); setBusy([]); return; }
    let cancelled = false;
    setScheduleLoading(true);
    void Promise.all([fetchAvailability(provider.user_id), fetchBusy(provider.user_id)])
      .then(([h, b]) => { if (!cancelled) { setHours(h); setBusy(b); } })
      .catch(() => { if (!cancelled) { setHours([]); setBusy([]); } })
      .finally(() => { if (!cancelled) setScheduleLoading(false); });
    return () => { cancelled = true; };
  }, [provider]);

  const category = categoryFor(provider, categoryParam ?? draftCategory);
  const serviceOptions = category?.services.map((s) => s.name) ?? [];

  // Restore a draft saved when a guest was sent to sign in. We keep the pro,
  // the service and the job, and re-validate the slot below.
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
      if (draft.categorySlug) setDraftCategory(draft.categorySlug);
      if (draft.date) setDateIso(draft.date);
      if (draft.time) setSlotMinute(Number(draft.time) || null);
      if (draft.providerId && draft.providerId !== providerParam) {
        void navigate({
          to: "/book",
          search: {
            provider: draft.providerId,
            ...(draft.jobId ? { job: draft.jobId } : {}),
            ...(draft.service ? { service: draft.service } : {}),
            ...(draft.categorySlug ? { category: draft.categorySlug } : {}),
          },
          replace: true,
        });
      }
      // Land on the schedule step when the draft carried a time, so any slot
      // that expired while the customer signed in is visible, never silent.
      setStep(draft.date ? 3 : steps.length - 1);
    } catch {
      /* ignore malformed draft */
    }
    // Runs once on mount; the redirect above carries the pro through.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The service address decides the timezone — never the customer's device.
  // A pro in Frisco works 8–8 Central even if the phone is set to Tokyo.
  // The previous location is dropped the moment the address is edited, so no
  // schedule is ever shown for a place the customer has already changed.
  useEffect(() => {
    let cancelled = false;
    const value = address.trim();
    setLocationChecked(false);
    setLocation(null);
    if (!value) return;
    void resolveServiceLocation(value).then((loc) => {
      if (!cancelled) { setLocation(loc); setLocationChecked(true); }
    });
    return () => { cancelled = true; };
  }, [address]);

  const durationMinutes = provider?.default_duration_minutes ?? 60;
  const bufferMinutes = provider?.travel_buffer_minutes ?? 0;
  const timeZone = location?.timeZone ?? null;
  const notBefore = useMemo(() => new Date(Date.now() + LEAD_TIME_MINUTES * 60_000), []);
  const today = timeZone ? todayInZone(timeZone, notBefore) : null;

  const days = useMemo(() => {
    if (!timeZone || !today || !provider || hours == null) {
      return [] as { iso: string; label: string; slots: number[] }[];
    }
    return Array.from({ length: 14 }, (_, i) => {
      const iso = addDaysIso(today, i);
      return {
        iso,
        label: dayLabel(iso, today),
        slots: slotsForDate(iso, { durationMinutes, bufferMinutes, timeZone, hours, busy, notBefore }),
      };
    }).filter((d) => d.slots.length > 0);
  }, [timeZone, today, provider, hours, busy, durationMinutes, bufferMinutes, notBefore]);

  // Keep the selection valid, and tell the customer when their saved slot went
  // away instead of silently moving them to another day. An empty calendar —
  // a closed week, a new address, a pro who just paused — clears it too.
  useEffect(() => {
    if (scheduleLoading || !timeZone) return;
    const current = days.find((d) => d.iso === dateIso);
    if (!current) {
      if (dateIso || slotMinute != null) setSlotWasReset(true);
      if (dateIso) setDateIso(null);
      if (slotMinute != null) setSlotMinute(null);
      return;
    }
    if (slotMinute != null && !current.slots.includes(slotMinute)) {
      setSlotWasReset(true);
      setSlotMinute(null);
    }
  }, [days, dateIso, slotMinute, scheduleLoading, timeZone]);

  const activeDay = days.find((d) => d.iso === dateIso) ?? null;
  const scheduleReady = Boolean(timeZone && dateIso && slotMinute != null);

  // One stable key per distinct request. Retrying the same confirmation reuses
  // it (so the database rejects the duplicate); changing the pro, the slot or
  // the address makes it a genuinely different request.
  const keySeed = `${provider?.user_id ?? ""}|${jobId ?? ""}|${dateIso ?? ""}|${slotMinute ?? ""}|${address.trim()}`;
  const keyRef = useRef<{ seed: string; key: string } | null>(null);
  if (keyRef.current?.seed !== keySeed) {
    keyRef.current = {
      seed: keySeed,
      key: typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    };
  }
  const requestKey = keyRef.current.key;

  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const submit = async () => {
    setError(null);
    if (!provider) { setError("Pick a professional before confirming."); return; }
    if (!service.trim()) { setError("Choose the service you need."); setStep(0); return; }
    if (!address.trim()) { setError("Please add a service address before confirming."); setStep(2); return; }
    if (!location) {
      setError("Add a US ZIP code we serve to your address so we can schedule in the right local time.");
      setStep(2);
      return;
    }
    if (!dateIso || slotMinute == null) {
      setError("Pick a date and start time for your job.");
      setStep(3);
      return;
    }

    if (!user) {
      if (typeof window !== "undefined") {
        const draft: BookingDraft = {
          service, details, address, date: dateIso, time: String(slotMinute),
          providerId: provider.user_id,
          ...(category ? { categorySlug: category.slug } : {}),
          ...(jobId ? { jobId } : {}),
        };
        window.localStorage.setItem(BOOKING_DRAFT_KEY, JSON.stringify(draft));
      }
      await navigate({ to: "/login", search: { redirect: "/book" } });
      return;
    }

    // Store the exact instant alongside the local wall time, so the job means
    // the same moment to the customer and the pro wherever each of them is.
    // The database recomputes end_at / occupied_end_at and re-checks the
    // window, the pro's hours, time off and overlaps — this is convenience.
    const startAt = zonedTimeToUtc(dateIso, slotMinute, location.timeZone);
    const timeLabel = formatSlot(slotMinute);

    setSubmitting(true);
    const { error: insertError } = await supabase.from("bookings").insert({
      customer_id: user.id,
      provider_id: provider.user_id,
      provider_name_snapshot: provider.business_name,
      job_id: jobId ?? null,
      service,
      details: details || null,
      service_address: address.trim(),
      scheduled_date: dateIso,
      scheduled_time: timeLabel,
      start_at: startAt.toISOString(),
      duration_minutes: durationMinutes,
      buffer_minutes: bufferMinutes,
      service_timezone: location.timeZone,
      status: "pending",
      // A retry of the same request can never become a second booking.
      idempotency_key: requestKey,
    });

    // 23505 on the idempotency index means this exact request already landed —
    // a double tap or a retried network call, not a new booking.
    const alreadySent =
      insertError != null &&
      ((insertError as { code?: string }).code === "23505" ||
        /idempotency/i.test(insertError.message));

    if (insertError && !alreadySent) {
      setSubmitting(false);
      // Someone else may have taken the slot while this form was open.
      const taken = /overlap|exclusion|conflict|just taken/i.test(insertError.message);
      setError(
        taken
          ? "That time was just taken. Pick another slot and we'll try again."
          : insertError.message || "We couldn't save your request. Please try again.",
      );
      if (taken) {
        setSlotMinute(null);
        setBusy(await fetchBusy(provider.user_id).catch(() => busy));
        setStep(3);
      }
      return;
    }

    if (jobId) {
      // The booking is only PENDING until the pro accepts, so the job stays in
      // "quotes requested" — it flips to booked from the pro's acceptance, not
      // from sending the request. A failure here is surfaced, never swallowed.
      const { error: jobError } = await supabase
        .from("service_requests")
        .update({
          service_address: address.trim(),
          preferred_date: dateIso,
          preferred_time: timeLabel,
        })
        .eq("id", jobId);
      if (jobError) {
        setSubmitting(false);
        setError(
          "Your request was sent, but we couldn't update the job record. Open the job to check its details.",
        );
      }
    }

    setSubmitting(false);
    setConfirmed(true);
    setTimeout(() => {
      if (jobId) void navigate({ to: "/job/$id", params: { id: jobId } });
      else void navigate({ to: "/dashboard" });
    }, 1600);
  };

  if (confirmed) {
    return (
      <AppShell hideBottomNav>
        <div className="mx-auto mt-16 max-w-md rounded-3xl border border-border/60 bg-card p-8 text-center shadow-elevated">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full text-white shadow-elevated" style={{ background: "var(--primary)" }}>
            <Check className="h-8 w-8" strokeWidth={3} />
          </div>
          <h1 className="mt-4 text-2xl font-black">Request sent</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {provider?.business_name ?? "Your pro"} now has your request. It stays <strong>pending</strong> until they
            accept it — you'll see the status change in your dashboard.
          </p>
        </div>
      </AppShell>
    );
  }

  if (providerState !== "ready" || !provider) {
    return (
      <AppShell hideBottomNav>
        <div className="mx-auto mt-12 max-w-md rounded-3xl border border-border/60 bg-card p-7 text-center shadow-sm">
          {providerState === "loading" ? (
            <>
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
              <p className="mt-3 text-sm text-muted-foreground">Checking this professional's availability…</p>
            </>
          ) : (
            <>
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-muted">
                <AlertTriangle className="h-6 w-6 text-muted-foreground" />
              </div>
              <h1 className="mt-3 text-xl font-black">Choose a professional first</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                GetPros only books real, verified pros who are currently accepting work. We won't create a request that
                nobody receives.
              </p>
              <Link
                to="/search"
                search={{ q: "", loc: "", pros: 1 }}
                className="mt-4 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-white"
                style={{ background: "var(--gradient-primary)" }}
              >
                Find a pro <ChevronRight className="h-4 w-4" />
              </Link>
            </>
          )}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell hideBottomNav>
      <div className="mx-auto max-w-2xl pt-4">
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-semibold">Step {step + 1} of {steps.length}</span>
            <span>{steps[step]}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%`, background: "var(--primary)" }} />
          </div>
        </div>

        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
          <Avatar initials={provider.business_name.slice(0, 2).toUpperCase()} gradient={category?.gradient ?? "from-[#2C5CA8] to-[#1F3A73]"} />
          <div className="min-w-0">
            <div className="truncate text-sm font-black">{provider.business_name}</div>
            <div className="truncate text-xs text-muted-foreground">
              {provider.service_category ?? "GetPros pro"}
              {provider.service_zip ? ` · serves ${provider.service_zip}` : ""}
            </div>
          </div>
          {provider.verification_status === "verified" && (
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-mint/25 px-2 py-1 text-xs font-bold uppercase tracking-wider text-mint-ink">
              <ShieldCheck className="h-3 w-3" /> Verified
            </span>
          )}
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm">
          {step === 0 && (
            <StepWrap
              title="What do you need?"
              subtitle={category ? `Services ${provider.business_name} offers under ${category.name}.` : "Tell us what the job is."}
            >
              {serviceOptions.length > 0 ? (
                <div className="grid gap-2">
                  {serviceOptions.map((opt) => (
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
              ) : (
                <input
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  placeholder="e.g. Kitchen sink leak repair"
                  className="w-full rounded-xl border border-border bg-background p-4 text-sm outline-none focus:border-primary"
                />
              )}
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
              <p className="mt-3 text-xs text-muted-foreground">
                Photo attachments aren't available on booking requests yet — describe the job here, or start from
                <Link to="/snap" className="ml-1 font-semibold text-primary">Snap a problem</Link> to send pictures with an
                AI diagnosis.
              </p>
            </StepWrap>
          )}

          {step === 2 && (
            <StepWrap title="Service address" subtitle="Where should the pro meet you?">
              <label className="flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-3">
                <MapPin className="h-4 w-4 shrink-0 text-primary" />
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Main St, Springfield 75034"
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                />
              </label>
              {locationChecked && !location && (
                <p className="mt-2 text-xs font-medium text-destructive">
                  We couldn't place that address in a US area we schedule for. Add a valid US ZIP code.
                </p>
              )}
              {location && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Scheduling in {location.city}, {location.state} local time ({location.timeZone}).
                </p>
              )}
              <div className="mt-3 rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
                The professional you send this to sees your full service address with the request, so they can judge
                travel before accepting. Nobody else on GetPros can see it.
              </div>
            </StepWrap>
          )}

          {step === 3 && (
            <StepWrap
              title="Pick date & time"
              subtitle={
                location
                  ? `Times shown in ${location.city}, ${location.state} local time. GetPros jobs run 8:00 AM–8:00 PM.`
                  : "Add a US ZIP code to your address and we'll show real local availability."
              }
            >
              {slotWasReset && (
                <div className="mb-3 rounded-2xl border border-amber-300/60 bg-amber-50 p-3 text-xs font-medium text-amber-900">
                  Your earlier time is no longer open. Please choose a new one — we haven't changed your date for you.
                </div>
              )}
              {!location ? (
                <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                  We schedule in the service address's own timezone, so we need a US ZIP code first.
                  <button onClick={() => setStep(2)} className="ml-1 font-bold text-primary underline">
                    Add your address
                  </button>
                </div>
              ) : scheduleLoading ? (
                <div className="flex items-center gap-2 rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading {provider.business_name}'s real openings…
                </div>
              ) : days.length === 0 ? (
                <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                  {provider.business_name} has no openings in the next 14 days for a job this length. Try another pro.
                </div>
              ) : (
                <>
                  <div className="-mx-1 mb-4 flex snap-x gap-2 overflow-x-auto px-1 pb-1">
                    {days.map((d) => (
                      <button
                        key={d.iso}
                        onClick={() => { setDateIso(d.iso); setSlotMinute(null); }}
                        className={`shrink-0 snap-start rounded-xl border px-4 py-2 text-sm font-semibold ${dateIso === d.iso ? "border-primary bg-primary text-white" : "border-border bg-background"}`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                  {activeDay ? (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {activeDay.slots.map((m) => (
                        <button
                          key={m}
                          onClick={() => { setSlotMinute(m); setSlotWasReset(false); }}
                          className={`rounded-full border px-3 py-2 text-xs font-semibold ${slotMinute === m ? "border-primary bg-primary/10 text-primary" : "border-border"}`}
                        >
                          {formatSlot(m)}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Pick a day to see open times.</p>
                  )}
                  <p className="mt-3 text-xs text-muted-foreground">
                    {provider.business_name} holds {durationMinutes} minutes for this job
                    {bufferMinutes > 0 ? ` plus ${bufferMinutes} minutes of travel` : ""}, and the earliest slot is
                    {" "}{LEAD_TIME_MINUTES / 60} hours from now.
                  </p>
                </>
              )}
            </StepWrap>
          )}

          {step === 4 && (
            <StepWrap title="Review your request" subtitle="Confirm the details below to send it to your pro.">
              <dl className="space-y-2 text-sm">
                <Row label="Pro" value={provider.business_name} />
                <Row label="Service" value={service || "—"} />
                <Row label="Details" value={details || "—"} />
                <Row label="Address" value={address || "—"} />
                <Row
                  label="Date & time"
                  value={
                    dateIso && slotMinute != null && location
                      ? `${dayLabel(dateIso, todayInZone(location.timeZone, notBefore))} · ${formatSlot(slotMinute)} (${location.city}, ${location.state})`
                      : "Not set"
                  }
                />
                <Row label="Held" value={`${durationMinutes} min job${bufferMinutes > 0 ? ` + ${bufferMinutes} min travel` : ""}`} />
              </dl>
              <p className="mt-4 text-xs text-muted-foreground">
                Sending this creates a <strong>pending</strong> request. It becomes a confirmed job only when
                {" "}{provider.business_name} accepts it.
              </p>
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
              <GradientButton
                onClick={next}
                disabled={
                  (step === 0 && !service.trim()) ||
                  // Never move on with a half-resolved address: the timezone
                  // decides every slot shown on the next step.
                  (step === 2 && (!address.trim() || !location)) ||
                  (step === 3 && !scheduleReady)
                }
              >
                Continue <ChevronRight className="h-4 w-4" />
              </GradientButton>
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
