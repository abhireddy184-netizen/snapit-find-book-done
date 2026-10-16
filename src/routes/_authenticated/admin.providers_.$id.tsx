import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, Clock, EyeOff, FileText, Loader2, Mail, MapPin, ShieldAlert, ShieldCheck } from "lucide-react";
import { AppShell, Avatar } from "@/components/getpros/AppShell";
import { DocStatus } from "@/components/getpros/ProviderDocuments";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { docTypeLabel, listDocuments, openDocument } from "@/lib/provider-documents";
import { adminRequestProviderDocuments } from "@/lib/provider-documents.functions";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/admin/providers_/$id")({
  head: () => ({
    meta: [
      { title: "Review pro — GetPros.ai admin" },
      { name: "description", content: "Admin-only preview of a GetPros provider profile and documents." },
      { property: "og:title", content: "Review pro — GetPros.ai admin" },
      { property: "og:description", content: "Admin-only provider review." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminProviderReview,
});

function AdminProviderReview() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const isAdmin = useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.rpc("is_admin")).data === true,
  });
  const preview = useQuery({
    queryKey: ["admin-provider-preview", id],
    enabled: isAdmin.data === true,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_get_provider_preview", { _user_id: id });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  if (!user || isAdmin.isLoading) return <AppShell><Center><Loader2 className="h-5 w-5 animate-spin" /></Center></AppShell>;
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

  const p = preview.data;
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl py-4">
        <Link to="/admin/providers" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary">
          <ArrowLeft className="h-4 w-4" /> Back to approvals
        </Link>
        {preview.isLoading && <Center><Loader2 className="h-5 w-5 animate-spin" /></Center>}
        {preview.isError && <p className="surface-card mt-4 p-4 text-sm text-destructive">Could not load this profile.</p>}
        {preview.isSuccess && !p && <p className="surface-card mt-4 p-4 text-sm">This pro hasn't created a business profile yet.</p>}
        {p && (
          <>
            {p.verification_status !== "verified" ? (
              <div role="note" className="mt-3 flex items-start gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-300">
                <EyeOff className="mt-0.5 h-4 w-4 shrink-0" />
                <span><strong>Unapproved — admin preview only.</strong> Customers can't see or book this pro. This is roughly how the listing would look after approval.</span>
              </div>
            ) : (
              <div className="mt-3 flex items-start gap-2 rounded-2xl border border-primary/30 bg-primary/10 p-4 text-sm">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>Approved — this listing is public. <Link to="/provider/$id" params={{ id }} className="font-semibold text-primary underline">Open public page</Link></span>
              </div>
            )}
            <section className="mt-4 overflow-hidden surface-card" aria-label="Listing preview">
              <div className="h-24 sm:h-32" style={{ background: "var(--gradient-primary)" }} />
              <div className="p-5 sm:p-6">
                <div className="-mt-14 flex min-w-0 items-end gap-4">
                  <Avatar initials={p.business_name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "GP"} gradient="from-primary to-secondary" size={80} />
                  <div className="min-w-0 pb-1">
                    <h1 className="truncate text-xl font-black sm:text-2xl">{p.business_name || "No business name yet"}</h1>
                    {p.service_category && <div className="truncate text-sm text-muted-foreground">{p.service_category}</div>}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                  {(p.service_area || p.service_zip) && (
                    <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" /> {p.service_area || p.service_zip}{p.service_radius_miles ? ` · up to ${p.service_radius_miles} mi` : ""}</span>
                  )}
                  {p.starting_price != null && <span className="font-semibold text-foreground">From ${Number(p.starting_price).toFixed(0)}</span>}
                  <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" /> ~{p.default_duration_minutes} min jobs</span>
                </div>
                {p.bio && <p className="mt-4 whitespace-pre-line text-sm text-muted-foreground">{p.bio}</p>}
                <p className="mt-5 text-xs font-semibold text-muted-foreground">Booking button hidden in admin preview.</p>
              </div>
            </section>
            <AdminDocuments userId={id} />
          </>
        )}
      </div>
    </AppShell>
  );
}

function AdminDocuments({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const request = useServerFn(adminRequestProviderDocuments);
  const [msg, setMsg] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const docs = useQuery({ queryKey: ["admin-docs", userId], queryFn: () => listDocuments(userId) });

  async function review(id: string, status: "accepted" | "rejected" | "pending") {
    const note = status === "rejected" ? window.prompt("Optional note for the pro (what's wrong with this file?)") ?? "" : "";
    setBusy(id);
    const { error } = await supabase.rpc("admin_review_provider_document", { _id: id, _status: status, _note: note });
    setBusy(null);
    if (error) return setMsg(error.message);
    await qc.invalidateQueries({ queryKey: ["admin-docs", userId] });
  }

  return (
    <section className="surface-card mt-4 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-black">Documents</h2>
          <p className="mt-1 text-sm text-muted-foreground">Private files uploaded by this pro. Reviewing a file never approves the pro.</p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button disabled={sending} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-border px-4 text-sm font-semibold hover:bg-muted disabled:opacity-50">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Request documents
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Email this pro a document request?</AlertDialogTitle>
              <AlertDialogDescription>
                This sends one GetPros email asking the pro to sign in and upload business registration, liability insurance
                and any applicable trade license in their dashboard. No files are attached. Only one request per pro per day.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  setSending(true);
                  setMsg(null);
                  try { setMsg((await request({ data: { userId, confirm: true } })).message); }
                  catch { setMsg("Could not send the request."); }
                  setSending(false);
                }}
              >
                Send email
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      {msg && <p role="status" className="mt-3 text-sm font-medium">{msg}</p>}
      {docs.isLoading && <Loader2 className="mt-3 h-5 w-5 animate-spin" />}
      {docs.data?.length === 0 && <p className="mt-3 text-sm text-muted-foreground">No documents uploaded yet.</p>}
      <ul className="mt-3 divide-y divide-border/60">
        {docs.data?.map((d) => (
          <li key={d.id} className="flex flex-col gap-2 py-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">{docTypeLabel(d.doc_type)}</span>
                <DocStatus status={d.status} />
              </div>
              <div className="truncate text-xs text-muted-foreground">{d.file_name} · {(d.size_bytes / 1024).toFixed(0)} KB · {new Date(d.created_at).toLocaleString()}</div>
              {d.admin_note && <div className="mt-1 text-xs">Note: {d.admin_note}</div>}
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => void openDocument(d).catch(() => setMsg("Could not open the file."))} className="inline-flex min-h-11 items-center gap-1 rounded-full border border-border px-4 text-sm font-semibold hover:bg-muted">
                <FileText className="h-4 w-4" /> Open
              </button>
              {d.status !== "accepted" && <button disabled={busy === d.id} onClick={() => review(d.id, "accepted")} className="min-h-11 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50">Mark reviewed</button>}
              {d.status !== "rejected" && <button disabled={busy === d.id} onClick={() => review(d.id, "rejected")} className="min-h-11 rounded-full border border-border px-4 text-sm font-semibold hover:bg-muted disabled:opacity-50">Ask for new file</button>}
              {d.status !== "pending" && <button disabled={busy === d.id} onClick={() => review(d.id, "pending")} className="min-h-11 rounded-full px-3 text-sm font-semibold text-muted-foreground hover:bg-muted disabled:opacity-50">Undo</button>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col items-center justify-center py-16 text-center">{children}</div>;
}
