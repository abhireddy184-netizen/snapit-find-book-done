import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

const KEY = "gp-oauth-intent";
export const PENDING_ROLE_KEY = "pending_signup_role";
type Intent = { role: "customer" | "provider" | null; redirect: string | null; at: number };

function safePath(p: string | null | undefined) {
  return p && p.startsWith("/") && !p.startsWith("//") ? p : null;
}

/** Start Google/Apple sign-in, remembering the chosen role and return path. */
export async function startOAuth(
  provider: "google" | "apple",
  opts: { role: "customer" | "provider" | null; redirect?: string | undefined },
) {
  const intent: Intent = { role: opts.role, redirect: safePath(opts.redirect), at: Date.now() };
  try {
    localStorage.setItem(KEY, JSON.stringify(intent));
    if (opts.role) localStorage.setItem(PENDING_ROLE_KEY, opts.role);
    else localStorage.removeItem(PENDING_ROLE_KEY);
  } catch {
    /* storage unavailable */
  }
  const result = await lovable.auth.signInWithOAuth(provider, {
    redirect_uri: `${window.location.origin}/auth/callback${opts.role ? `?role=${opts.role}` : ""}`,
    ...(provider === "google" ? { extraParams: { prompt: "select_account" } } : {}),
  });
  if (result.error) throw result.error;
  return result;
}

export function readIntent(): Intent | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Intent;
    if (Date.now() - v.at > 30 * 60 * 1000) return null;
    return v;
  } catch {
    return null;
  }
}

export function clearIntent() {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(PENDING_ROLE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * After OAuth: fill a missing name, and apply the chosen Provider role only for
 * brand-new accounts. Existing roles are never overwritten.
 */
export async function reconcileProfile(
  userId: string,
  intent: Intent | null,
): Promise<{ role: "customer" | "provider"; conflict: boolean }> {
  const { data: u } = await supabase.auth.getUser();
  const meta = (u.user?.user_metadata ?? {}) as Record<string, unknown>;
  const metaName = String(meta["full_name"] ?? meta["name"] ?? "").trim();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, created_at")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) {
    const role = intent?.role === "provider" ? "provider" : "customer";
    await supabase.from("profiles").insert({
      id: userId,
      full_name: metaName,
      role,
      is_provider: role === "provider",
      provider_since: role === "provider" ? new Date().toISOString() : null,
    });
    return { role, conflict: false };
  }

  const patch: { full_name?: string; role?: "customer" | "provider"; is_provider?: boolean; provider_since?: string } = {};
  if (!profile.full_name && metaName) patch.full_name = metaName;
  const isNew = Date.now() - new Date(profile.created_at).getTime() < 10 * 60 * 1000;
  if (!isNew && intent?.role && intent.role !== profile.role) {
    // Existing account with a different role: never change it.
    return { role: profile.role as "customer" | "provider", conflict: true };
  }
  if (isNew && intent?.role === "provider" && profile.role === "customer") {
    patch.role = "provider";
    patch.is_provider = true;
    patch.provider_since = new Date().toISOString();
  }
  if (Object.keys(patch).length) {
    await supabase.from("profiles").update(patch).eq("id", userId);
  }
  return { role: (patch.role ?? profile.role) as "customer" | "provider", conflict: false };
}
