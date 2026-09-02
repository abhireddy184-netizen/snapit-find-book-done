import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarOff, Clock, Loader2, PauseCircle, PlayCircle, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  WEEKDAY_LABELS,
  addTimeOff,
  defaultWeeklyHours,
  fetchAvailability,
  fetchTimeOff,
  removeTimeOff,
  saveAvailability,
} from "@/lib/schedule";
import {
  SERVICE_WINDOW_END_MINUTE,
  SERVICE_WINDOW_START_MINUTE,
  formatSlot,
  type WeeklyHours,
} from "@/lib/service-hours";

const HALF_HOURS = Array.from(
  { length: (SERVICE_WINDOW_END_MINUTE - SERVICE_WINDOW_START_MINUTE) / 30 + 1 },
  (_, i) => SERVICE_WINDOW_START_MINUTE + i * 30,
);

/**
 * Provider work management: weekly hours, time off, pause, job length.
 * Hours are always inside the GPB platform window (8:00 AM–8:00 PM in the
 * service location's local time) — a pro can narrow it, never extend it.
 */
export function ProviderWorkSettings({ userId }: { userId: string | undefined }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const profileQuery = useQuery({
    queryKey: ["provider-work-profile", userId],
    queryFn: async () => {
      const { data, error: e } = await supabase
        .from("provider_profiles")
        .select("id,accepting_bookings,default_duration_minutes,travel_buffer_minutes")
        .eq("user_id", userId as string)
        .maybeSingle();
      if (e) throw e;
      return data;
    },
    enabled: Boolean(userId),
  });

  const hoursQuery = useQuery({
    queryKey: ["provider-availability", userId],
    queryFn: () => fetchAvailability(userId as string),
    enabled: Boolean(userId),
  });

  const timeOffQuery = useQuery({
    queryKey: ["provider-time-off", userId],
    queryFn: () => fetchTimeOff(userId as string),
    enabled: Boolean(userId),
  });

  const [hours, setHours] = useState<WeeklyHours[]>([]);
  const [duration, setDuration] = useState(60);
  const [buffer, setBuffer] = useState(15);
  const [accepting, setAccepting] = useState(true);

  useEffect(() => {
    if (!hoursQuery.data) return;
    setHours(hoursQuery.data.length ? hoursQuery.data : defaultWeeklyHours());
  }, [hoursQuery.data]);

  useEffect(() => {
    const p = profileQuery.data;
    if (!p) return;
    setDuration(p.default_duration_minutes ?? 60);
    setBuffer(p.travel_buffer_minutes ?? 15);
    setAccepting(p.accepting_bookings ?? true);
  }, [profileQuery.data]);

  const byDay = useMemo(() => {
    const map = new Map<number, WeeklyHours>();
    hours.forEach((h) => map.set(h.weekday, h));
    return map;
  }, [hours]);

  function setDay(weekday: number, next: WeeklyHours | null) {
    setHours((prev) => {
      const rest = prev.filter((h) => h.weekday !== weekday);
      return next ? [...rest, next].sort((a, b) => a.weekday - b.weekday) : rest;
    });
  }

  async function save() {
    if (!userId) return;
    setError(null);
    setMessage(null);
    if (!profileQuery.data) {
      setError("Save your business profile first — your work hours attach to it.");
      return;
    }
    setSaving(true);
    try {
      await saveAvailability(userId, hours);
      const { error: e } = await supabase
        .from("provider_profiles")
        .update({
          accepting_bookings: accepting,
          default_duration_minutes: duration,
          travel_buffer_minutes: buffer,
        })
        .eq("user_id", userId);
      if (e) throw e;
      setMessage("Work settings saved.");
      await queryClient.invalidateQueries({ queryKey: ["provider-availability", userId] });
      await queryClient.invalidateQueries({ queryKey: ["provider-work-profile", userId] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't save your work settings.");
    } finally {
      setSaving(false);
    }
  }

  if (profileQuery.isLoading || hoursQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading your work settings…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-border/60 bg-card p-5 shadow-sm sm:p-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black">Weekly hours</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              GPB jobs run 8:00 AM–8:00 PM in the customer's local time. Set narrower hours if you want; you can't book
              outside the platform window.
            </p>
          </div>
          <button
            onClick={() => setAccepting((v) => !v)}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold ${
              accepting ? "border-border hover:bg-muted" : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
            }`}
          >
            {accepting ? <><PauseCircle className="h-4 w-4" /> Pause new bookings</> : <><PlayCircle className="h-4 w-4" /> Resume bookings</>}
          </button>
        </header>

        {!accepting && (
          <p className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-700 dark:text-amber-400">
            New booking requests are paused. Jobs you already accepted are unaffected.
          </p>
        )}

        <ul className="mt-4 space-y-2">
          {WEEKDAY_LABELS.map((label, weekday) => {
            const day = byDay.get(weekday);
            return (
              <li
                key={label}
                className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-2xl border border-border/60 bg-background p-3 sm:grid-cols-[5rem_auto_auto_minmax(0,1fr)]"
              >
                <label className="inline-flex items-center gap-2 text-sm font-bold">
                  <input
                    type="checkbox"
                    checked={Boolean(day)}
                    onChange={(e) =>
                      setDay(weekday, e.target.checked
                        ? { weekday, startMinute: SERVICE_WINDOW_START_MINUTE, endMinute: SERVICE_WINDOW_END_MINUTE }
                        : null)
                    }
                    className="h-4 w-4 accent-[var(--primary)]"
                    aria-label={`Work on ${label}`}
                  />
                  {label}
                </label>
                {day ? (
                  <>
                    <TimeSelect
                      label={`${label} start`}
                      value={day.startMinute}
                      options={HALF_HOURS.filter((m) => m < day.endMinute)}
                      onChange={(v) => setDay(weekday, { ...day, startMinute: v })}
                    />
                    <TimeSelect
                      label={`${label} end`}
                      value={day.endMinute}
                      options={HALF_HOURS.filter((m) => m > day.startMinute)}
                      onChange={(v) => setDay(weekday, { ...day, endMinute: v })}
                    />
                  </>
                ) : (
                  <span className="col-span-1 text-sm text-muted-foreground sm:col-span-3">Not working</span>
                )}
              </li>
            );
          })}
        </ul>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <NumberField
            label="Default job length (minutes)"
            value={duration}
            min={15}
            max={480}
            step={15}
            onChange={setDuration}
            hint="The whole job must fit before 8:00 PM local time."
          />
          <NumberField
            label="Travel / setup buffer (minutes)"
            value={buffer}
            min={0}
            max={120}
            step={5}
            onChange={setBuffer}
            hint="Held after each job so back-to-back bookings stay realistic."
          />
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          A {duration}-minute job with a {buffer}-minute buffer can start at{" "}
          <strong>{formatSlot(SERVICE_WINDOW_END_MINUTE - duration - buffer)}</strong> at the latest.
        </p>

        {error && <p className="mt-3 text-xs font-medium text-destructive">{error}</p>}
        {message && <p className="mt-3 text-xs font-medium text-mint-ink">{message}</p>}

        <button
          onClick={save}
          disabled={saving}
          className="mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white shadow-sm disabled:opacity-50"
          style={{ background: "var(--gradient-primary)" }}
        >
          {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : <><Clock className="h-4 w-4" /> Save work settings</>}
        </button>
      </section>

      <TimeOffSection userId={userId} rows={timeOffQuery.data ?? []} loading={timeOffQuery.isLoading} />
    </div>
  );
}

function TimeSelect({
  label, value, options, onChange,
}: { label: string; value: number; options: number[]; onChange: (v: number) => void }) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="rounded-xl border border-border bg-background px-2.5 py-2 text-sm font-semibold outline-none focus:border-primary"
    >
      {options.map((m) => (
        <option key={m} value={m}>{formatSlot(m)}</option>
      ))}
    </select>
  );
}

function NumberField({
  label, value, min, max, step, onChange, hint,
}: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; hint?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value) || min)))}
        className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm font-semibold outline-none focus:border-primary"
      />
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

function TimeOffSection({
  userId, rows, loading,
}: { userId: string | undefined; rows: Awaited<ReturnType<typeof fetchTimeOff>>; loading: boolean }) {
  const queryClient = useQueryClient();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    if (!userId) return;
    setError(null);
    if (!from || !to) { setError("Pick a start and an end for your time off."); return; }
    const start = new Date(from);
    const end = new Date(to);
    if (!(end > start)) { setError("The end has to be after the start."); return; }
    setBusy(true);
    try {
      await addTimeOff(userId, start.toISOString(), end.toISOString(), reason.trim());
      setFrom(""); setTo(""); setReason("");
      await queryClient.invalidateQueries({ queryKey: ["provider-time-off", userId] });
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't save that time off.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-3xl border border-border/60 bg-card p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-black">Time off</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Blocked time never shows as available to customers. Existing accepted jobs are not cancelled — reach out to the
        customer if you need to move one.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_1.2fr_auto]">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">From</span>
          <input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)}
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" />
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">To</span>
          <input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)}
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" />
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reason (optional)</span>
          <input value={reason} onChange={(e) => setReason(e.target.value.slice(0, 120))} placeholder="Vacation"
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary" />
        </label>
        <button onClick={add} disabled={busy}
          className="mt-1 inline-flex items-center justify-center gap-2 self-end rounded-full border border-border px-4 py-2.5 text-sm font-bold hover:bg-muted disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Block
        </button>
      </div>
      {error && <p className="mt-2 text-xs font-medium text-destructive">{error}</p>}

      <div className="mt-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarOff className="h-4 w-4" /> No upcoming time off.
          </p>
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/60 bg-background p-3 text-sm">
                <span className="min-w-0">
                  <strong className="font-bold">{new Date(r.starts_at).toLocaleString()}</strong>
                  {" → "}
                  {new Date(r.ends_at).toLocaleString()}
                  {r.reason && <span className="text-muted-foreground"> · {r.reason}</span>}
                </span>
                <button
                  onClick={async () => {
                    await removeTimeOff(r.id);
                    await queryClient.invalidateQueries({ queryKey: ["provider-time-off", userId] });
                  }}
                  aria-label="Remove time off"
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-bold hover:bg-muted"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
