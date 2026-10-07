import { changeBookingStatus } from "./booking-actions.functions";
/**
 * Data access for provider work settings and real availability.
 * Every mutation is scoped by row-level security to the signed-in provider;
 * the database also enforces the 8 AM–8 PM window, overlap prevention and the
 * booking lifecycle, so the UI here is convenience, not the security boundary.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { TimeOff, WeeklyHours } from "@/lib/service-hours";
import { SERVICE_WINDOW_END_MINUTE, SERVICE_WINDOW_START_MINUTE } from "@/lib/service-hours";

export type AvailabilityRow = Database["public"]["Tables"]["provider_availability"]["Row"];
export type TimeOffRow = Database["public"]["Tables"]["provider_time_off"]["Row"];
export type BookingStatus = Database["public"]["Enums"]["booking_status"];

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Weekdays a new provider starts with: Mon–Sat, full platform window. */
export function defaultWeeklyHours(): WeeklyHours[] {
  return [1, 2, 3, 4, 5, 6].map((weekday) => ({
    weekday,
    startMinute: SERVICE_WINDOW_START_MINUTE,
    endMinute: SERVICE_WINDOW_END_MINUTE,
  }));
}

export async function fetchAvailability(providerId: string): Promise<WeeklyHours[]> {
  const { data, error } = await supabase
    .from("provider_availability")
    .select("weekday,start_minute,end_minute")
    .eq("provider_id", providerId)
    .order("weekday");
  if (error) throw error;
  return (data ?? []).map((r) => ({ weekday: r.weekday, startMinute: r.start_minute, endMinute: r.end_minute }));
}

/**
 * Replace the whole week atomically through a security-definer function.
 * Doing this as delete+insert from the client could leave the provider with
 * no rows (read as "closed", never as "open") if the insert failed; the RPC
 * runs both halves in one transaction instead. An empty array means
 * "closed all week" and is saved as such — it never falls back to all-open.
 */
export async function saveAvailability(_providerId: string, hours: WeeklyHours[]): Promise<void> {
  const clamped = hours
    .map((h) => ({
      weekday: h.weekday,
      start_minute: Math.max(SERVICE_WINDOW_START_MINUTE, Math.min(h.startMinute, SERVICE_WINDOW_END_MINUTE - 30)),
      end_minute: Math.min(SERVICE_WINDOW_END_MINUTE, Math.max(h.endMinute, SERVICE_WINDOW_START_MINUTE + 30)),
    }))
    .filter((h) => h.end_minute > h.start_minute);

  const { error } = await supabase.rpc("replace_provider_availability", { _hours: clamped });
  if (error) throw error;
}

export async function fetchTimeOff(providerId: string): Promise<TimeOffRow[]> {
  const { data, error } = await supabase
    .from("provider_time_off")
    .select("*")
    .eq("provider_id", providerId)
    .gte("ends_at", new Date().toISOString())
    .order("starts_at");
  if (error) throw error;
  return data ?? [];
}

export async function addTimeOff(providerId: string, startsAt: string, endsAt: string, reason: string): Promise<void> {
  const { error } = await supabase
    .from("provider_time_off")
    .insert({ provider_id: providerId, starts_at: startsAt, ends_at: endsAt, reason });
  if (error) throw error;
}

export async function removeTimeOff(id: string): Promise<void> {
  const { error } = await supabase.from("provider_time_off").delete().eq("id", id);
  if (error) throw error;
}

export function toTimeOffRanges(rows: TimeOffRow[]): TimeOff[] {
  return rows.map((r) => ({ startsAt: r.starts_at, endsAt: r.ends_at }));
}

/**
 * Time a provider is unavailable, as anonymous [start,end) intervals.
 * This RPC deliberately exposes no customer, address, reason or job detail —
 * it merges bookings (job + travel buffer) and time off into bare ranges, so
 * a customer picking a slot never reads another customer's data.
 */
export async function fetchBusy(
  providerId: string,
  from: Date = new Date(),
  to: Date = new Date(Date.now() + 45 * 86_400_000),
): Promise<{ startAt: string; endAt: string }[]> {
  const { data, error } = await supabase.rpc("provider_busy_intervals", {
    _provider_id: providerId,
    _from: from.toISOString(),
    _to: to.toISOString(),
  });
  if (error) throw error;
  return (data ?? []).map((r) => ({ startAt: r.starts_at, endAt: r.ends_at }));
}

/* --------------------------------------------------------- job transitions */

const NEXT: Record<BookingStatus, BookingStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return NEXT[from].includes(to);
}

/**
 * Move a job forward. The `.eq("status", from)` guard makes the update
 * idempotent under double taps and retries: a second attempt matches no row
 * instead of re-running the transition.
 */
export async function transitionBooking(
  id: string,
  from: BookingStatus,
  to: BookingStatus,
  extra: { declineReason?: string } = {},
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!canTransition(from, to)) return { ok: false, message: `A ${from.replace("_", " ")} job can't be moved to ${to.replace("_", " ")}.` };

  // Status changes run server-side, where the caller's role is checked.
  try {
    return await changeBookingStatus({
      data: { id, from, to, ...(extra.declineReason ? { declineReason: extra.declineReason } : {}) },
    });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "We couldn't update this job. Please try again." };
  }
}
