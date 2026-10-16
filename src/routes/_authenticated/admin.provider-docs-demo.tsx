import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ShieldAlert } from "lucide-react";
import { AppShell } from "@/components/getpros/AppShell";
import { ProviderDocuments } from "@/components/getpros/ProviderDocuments";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { ProviderDocument } from "@/lib/provider-documents";

export const Route = createFileRoute("/_authenticated/admin/provider-docs-demo")({
  head: () => ({
    meta: [
      { title: "Provider Documents screen demo · GetPros admin" },
      { name: "description", content: "Admin-only sample of the provider Documents screen with made-up data." },
      { property: "og:title", content: "Provider Documents screen demo · GetPros admin" },
      { property: "og:description", content: "Admin-only sample of the provider Documents screen." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DocsDemo,
});

const now = Date.now();
// Made-up sample rows. Not linked to any real provider or file.
const SAMPLE: ProviderDocument[] = [
  { id: "demo-1", user_id: "demo", doc_type: "business_registration", storage_path: "", file_name: "sample-business-registration.pdf", mime_type: "application/pdf", size_bytes: 1, status: "accepted", admin_note: null, reviewed_at: null, created_at: new Date(now - 2 * 86400e3).toISOString() },
  { id: "demo-2", user_id: "demo", doc_type: "liability_insurance", storage_path: "", file_name: "sample-insurance-certificate.pdf", mime_type: "application/pdf", size_bytes: 1, status: "pending", admin_note: null, reviewed_at: null, created_at: new Date(now - 86400e3).toISOString() },
  { id: "demo-3", user_id: "demo", doc_type: "trade_license", storage_path: "", file_name: "sample-license-photo.jpg", mime_type: "image/jpeg", size_bytes: 1, status: "rejected", admin_note: "The photo is blurry — please upload a clearer copy.", reviewed_at: null, created_at: new Date(now - 3600e3).toISOString() },
];

function DocsDemo() {
  const { user } = useAuth();
  const isAdmin = useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.rpc("is_admin")).data === true,
  });
  if (!user || isAdmin.isLoading) return <AppShell><div className="grid place-items-center py-20"><Loader2 className="h-5 w-5 animate-spin" /></div></AppShell>;
  if (!isAdmin.data)
    return (
      <AppShell>
        <div className="grid place-items-center py-20 text-center">
          <ShieldAlert className="h-6 w-6 text-muted-foreground" />
          <p className="mt-2 font-bold">This page is for GetPros admins only.</p>
          <Link to="/" className="mt-3 text-sm font-semibold text-primary">Back to home</Link>
        </div>
      </AppShell>
    );
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-4 py-4">
        <Link to="/admin/providers" className="inline-flex min-h-11 items-center text-sm font-semibold text-primary">← Back to Approve pros</Link>
        <div role="note" className="rounded-2xl border border-primary/30 bg-primary/10 p-4 text-sm">
          <p className="font-bold">Demo with sample data — admin only</p>
          <p className="mt-1 text-muted-foreground">
            This is how the Documents tab looks to a signed-in pro (Dashboard → Documents). Everything below is
            made up: it is not a real provider, buttons are switched off, and no real files are shown. Real
            uploads are only visible on each pro's "Preview profile &amp; documents" page.
          </p>
        </div>
        <ProviderDocuments userId={undefined} demoDocs={SAMPLE} />
      </div>
    </AppShell>
  );
}
