import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type ProviderService = Database["public"]["Tables"]["provider_services"]["Row"];

export async function fetchProviderServices(userId: string): Promise<ProviderService[]> {
  const { data, error } = await supabase
    .from("provider_services")
    .select("*")
    .eq("user_id", userId)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function addProviderService(
  userId: string,
  categorySlug: string,
  categoryLabel: string,
  isPrimary = false,
) {
  const { error } = await supabase
    .from("provider_services")
    .upsert(
      { user_id: userId, category_slug: categorySlug, category_label: categoryLabel, is_primary: isPrimary },
      { onConflict: "user_id,category_slug" },
    );
  if (error) throw error;
}

export async function removeProviderService(userId: string, categorySlug: string) {
  const { error } = await supabase
    .from("provider_services")
    .delete()
    .eq("user_id", userId)
    .eq("category_slug", categorySlug);
  if (error) throw error;
}

export async function setPrimaryProviderService(userId: string, categorySlug: string) {
  await supabase.from("provider_services").update({ is_primary: false }).eq("user_id", userId);
  const { error } = await supabase
    .from("provider_services")
    .update({ is_primary: true })
    .eq("user_id", userId)
    .eq("category_slug", categorySlug);
  if (error) throw error;
}

/** Marks the account as provider-capable without removing customer abilities. */
export async function enableProviderCapability(userId: string) {
  const { error } = await supabase
    .from("profiles")
    .update({ is_provider: true, provider_since: new Date().toISOString() })
    .eq("id", userId)
    .eq("is_provider", false);
  if (error) throw error;
}
