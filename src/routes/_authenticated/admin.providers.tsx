import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check, Loader2, ShieldAlert, ShieldCheck, X, Mail, Phone, MapPin } from "lucide-react";
import { AppShell, GradientButton } from "@/components/snapit/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/admin/providers")({
  head: () => ({
    meta: [
      { title: "Approve pros — GetPros.ai" },
      { name: "description", content: "Review and approve new GetPros.ai service provider profiles." },
      { property: "og:title", content: "Approve pros — GetPros.ai" },
      { property: "og:description", content: "Admin review of new provider signups." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminProviders,
});

type Status = "unverified" | "pending" | "verified";

function AdminProviders() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.rpc("has_role", { _user_id: user!.id, _role: "admin" });
      return data === true;
    },
  });

  const list = useQuery({
    queryKey: ["admin-providers"],
    enabled: isAdmin.data === true,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_providers");
      if (error) throw error;
      return data ?? [];
    },
  });

  async function setStatus(userId: string, status: Status) {
    setBusy(userId);
    setError(null);
    const { error } = await supabase.rpc("admin_set_provider_verification", { _user_id: userId, _status: status });
    setBusy(null);
    if (error) return setError(error.message);
    await qc.invalidateQueries({ queryKey: ["admin-providers"] });
  }

  if (isAdmin.isLoading || !user) return <AppShell><Center><Loader2 className="h-5 w-5 animate-spin" /></Center></AppShell>;
  if (!isAdmin.data)
    return (
      <AppShell>
        <Center>
          <ShieldAlert className="h-6 w-6 text-muted-foreground" />
          <p className="mt-2 font-bold">This page is for GetPros admins only.</p>
          <Link to="/" className="mt-3 text-sm font-semibold text-primary">Back to home</Link>
        </Center>
      </AppShell>
    );

  const rows = list.data ?? [];
  const waiting = rows.filter((r) => r.verification_status !== "verified");
  const approved = rows.filter((r) => r.verification_status === "verified");

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl py-4">
        <h1 className="text-2xl font-black">Approve pros</h1>
        <p className="mt-1 text-sm text-muted-foreground">New pros can't be booked until you approve them here.</p>
        {error && <p className="mt-3 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        {list.isLoading && <Center><Loader2 className="h-5 w-5 animate-spin" /></Center>}

        <h2 className="mt-6 text-sm font-bold uppercase tracking-wider text-muted-foreground">Waiting for approval ({waiting.length})</h2>
        <div className="mt-2 space-y-3">
          {waiting.length === 0 && !list.isLoading && <p className="surface-card p-4 text-sm text-muted-foreground">No pros waiting.</p>}
          {waiting.map((r) => (
            <Row key={r.user_id} r={r}>
              <GradientButton disabled={busy === r.user_id} onClick={() => setStatus(r.user_id, "verified")} className="w-full sm:w-auto">
                {busy === r.user_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Approve
              </GradientButton>
            </Row>
          ))}
        </div>

        <h2 className="mt-8 text-sm font-bold uppercase tracking-wider text-muted-foreground">Approved ({approved.length})</h2>
        <div className="mt-2 space-y-3">
          {approved.map((r) => (
            <Row key={r.user_id} r={r}>
              <button
                disabled={busy === r.user_id}
                onClick={() => setStatus(r.user_id, "unverified")}
                className="inline-flex min-h-11 w-full items-center justify-center gap-1 rounded-full border border-border px-4 text-sm font-semibold hover:bg-muted sm:w-auto"
              >
                <X className="h-4 w-4" /> Remove approval
              </button>
            </Row>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

type ProviderRow = {
  user_id: string; business_name: string; full_name: string | null; email: string | null; phone: string | null;
  service_category: string | null; service_area: string | null; service_zip: string | null;
  starting_price: number | null; bio: string | null; verification_status: Status;
};

function Row({ r, children }: { r: ProviderRow; children: React.ReactNode }) {
  return (
    <div className="surface-card flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1 text-sm">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-black">{r.business_name || "No business name yet"}</span>
          {r.verification_status === "verified" && <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />}
        </div>
        <div className="text-muted-foreground">{[r.full_name, r.service_category].filter(Boolean).join(" · ")}</div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
          {r.email && <span className="inline-flex min-w-0 items-center gap-1 break-all"><Mail className="h-3.5 w-3.5 shrink-0" />{r.email}</span>}
          {r.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{r.phone}</span>}
          {(r.service_area || r.service_zip) && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{r.service_area || r.service_zip}</span>}
          {r.starting_price != null && <span>From ${Number(r.starting_price).toFixed(0)}</span>}
        </div>
        {r.bio && <p className="line-clamp-3 text-muted-foreground">{r.bio}</p>}
        <Link to="/provider/$id" params={{ id: r.user_id }} className="inline-block text-xs font-semibold text-primary">View public page</Link>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col items-center justify-center py-16 text-center">{children}</div>;
}
