import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Booking = Database["public"]["Tables"]["bookings"]["Row"];
export type ProviderProfile = Database["public"]["Tables"]["provider_profiles"]["Row"];

export async function fetchCustomerBookings(customerId: string): Promise<Booking[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchProviderBookings(providerId: string): Promise<Booking[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("provider_id", providerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/**
 * The signed-in pro's own profile, including private fields such as phone.
 * `provider_profiles` no longer grants those columns to ordinary roles, so
 * the owner reads them through a security-definer function instead.
 */
export async function fetchMyProviderProfile(_userId: string): Promise<ProviderProfile | null> {
  const { data, error } = await supabase.rpc("get_my_provider_profile");
  if (error) throw error;
  return (data?.[0] as ProviderProfile | undefined) ?? null;
}

export function formatBookingDate(value: string): string {
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
}

export const BOOKING_DRAFT_KEY = "snapit:booking-draft";
