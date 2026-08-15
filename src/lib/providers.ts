import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { haversineMiles, loadZipIndex, type ZipPlace } from "@/lib/us-zip";

export type ProviderRow = Database["public"]["Tables"]["provider_profiles"]["Row"];

/** Public-safe columns only — provider_profiles is readable by anon. */
const PUBLIC_COLUMNS =
  "id, user_id, business_name, service_category, service_area, starting_price, availability, bio, verification_status, service_zip, service_radius_miles";

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
