import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { haversineMiles, loadZipIndex, type ZipPlace } from "@/lib/us-zip";

export type ProviderRow = Database["public"]["Tables"]["provider_profiles"]["Row"];

/**
 * Public-safe columns only. The database also enforces this: `anon` and
 * `authenticated` hold column-level SELECT grants that exclude `phone`, so a
 * hand-written query cannot widen it.
 */
const PUBLIC_COLUMNS =
  "id, user_id, business_name, service_category, service_area, starting_price, availability, bio, verification_status, service_zip, service_radius_miles, accepting_bookings, default_duration_minutes, travel_buffer_minutes";

export type PublicProvider = Pick<
  ProviderRow,
  | "id"
  | "user_id"
  | "business_name"
  | "service_category"
  | "service_area"
  | "starting_price"
  | "availability"
  | "bio"
  | "verification_status"
  | "service_zip"
  | "service_radius_miles"
  | "accepting_bookings"
  | "default_duration_minutes"
  | "travel_buffer_minutes"
>;

export type ProviderMatch = {
  provider: PublicProvider;
  /** Distance from the customer ZIP centroid, when both ZIPs are known. */
  distanceMiles: number | null;
  place: ZipPlace | null;
};

export async function fetchPublicProviders(): Promise<PublicProvider[]> {
  const { data, error } = await supabase
    .from("provider_profiles")
    .select(PUBLIC_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as PublicProvider[];
}

const DEFAULT_RADIUS_MILES = 25;

/**
 * Rank real providers against a customer location.
 * A provider is only "serving" the area when both ZIPs resolve and the
 * distance is inside the provider's declared radius. We never fabricate
 * proximity for providers without a ZIP.
 */
export async function matchProviders(
  providers: PublicProvider[],
  customer: ZipPlace | null,
  categoryName?: string,
): Promise<{ serving: ProviderMatch[]; others: ProviderMatch[] }> {
  const index = customer ? await loadZipIndex() : null;
  const serving: ProviderMatch[] = [];
  const others: ProviderMatch[] = [];

  for (const provider of providers) {
    if (categoryName && provider.service_category && provider.service_category !== categoryName) {
      continue;
    }
    const place = provider.service_zip && index ? (index.get(provider.service_zip) ?? null) : null;
    const distanceMiles = place && customer ? haversineMiles(customer, place) : null;
    const radius = provider.service_radius_miles ?? DEFAULT_RADIUS_MILES;
    const match: ProviderMatch = { provider, distanceMiles, place };
    if (distanceMiles != null && distanceMiles <= radius) serving.push(match);
    else others.push(match);
  }

  serving.sort((a, b) => (a.distanceMiles ?? 0) - (b.distanceMiles ?? 0));
  return { serving, others };
}

/** One real provider by its auth user id — the id bookings are assigned to. */
export async function fetchProviderByUserId(userId: string): Promise<PublicProvider | null> {
  const { data, error } = await supabase
    .from("provider_profiles")
    .select(PUBLIC_COLUMNS)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as PublicProvider | null) ?? null;
}

/** Auth user ids of the providers who signed up for a catalog category slug. */
export async function fetchProviderIdsForCategory(slug: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("provider_services")
    .select("user_id")
    .eq("category_slug", slug);
  if (error) throw error;
  return (data ?? []).map((r) => r.user_id);
}

/**
 * A provider can only be booked when GetPros has actually verified them and they
 * are accepting work. `pending` verification is NOT bookable — the database
 * booking rules enforce exactly the same test, so the UI can never offer a pro
 * the server would reject.
 */
export function isBookable(provider: PublicProvider): boolean {
  return provider.accepting_bookings === true && provider.verification_status === "verified";
}

/**
 * Real, bookable providers for a category slug near a customer ZIP.
 * Returns an empty list when nobody qualifies — we never fall back to samples.
 */
export async function fetchBookableProviders(
  slug: string | null,
  customer: ZipPlace | null,
): Promise<ProviderMatch[]> {
  const all = (await fetchPublicProviders()).filter(isBookable);
  let pool = all;
  if (slug) {
    const ids = new Set(await fetchProviderIdsForCategory(slug));
    pool = all.filter((p) => ids.has(p.user_id));
  }
  const { serving } = await matchProviders(pool, customer);
  return serving;
}
