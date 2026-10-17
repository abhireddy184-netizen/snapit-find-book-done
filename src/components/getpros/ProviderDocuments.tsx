import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { FileText, Loader2, Lock, Trash2, Upload } from "lucide-react";
import {
  DOC_TYPES,
  docTypeLabel,
  listDocuments,
  openDocument,
  removePendingDocument,
  uploadDocument,
  validateDocFile,
  type DocType,
  type ProviderDocument,
} from "@/lib/provider-documents";
import { notifyMyDocumentsUploaded } from "@/lib/provider-documents.functions";
import { Button } from "@/components/ui/button";

export function DocStatus({ status }: { status: ProviderDocument["status"] }) {
  const map = {
    pending: "bg-muted text-muted-foreground",
    accepted: "bg-primary/10 text-primary",
    rejected: "bg-destructive/10 text-destructive",
  } as const;
  const label = {
    pending: "Waiting for review",
    accepted: "Reviewed",
    rejected: "Needs a new file",
  }[status];
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${map[status]}`}>
      {label}
    </span>
  );
}

/** Provider's own private document uploads (Documents tab). */
/** With `demoDocs`, renders a read-only sample (admin demo): no uploads, no file access, no real data. */
export function ProviderDocuments({
  userId,
  demoDocs,
  unified = false,
}: {
  userId: string | undefined;
  demoDocs?: ProviderDocument[];
  unified?: boolean;
}) {
  const demo = !!demoDocs;
  const qc = useQueryClient();
  const [docType, setDocType] = useState<DocType>("business_registration");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const docs = useQuery({
    queryKey: ["my-documents", userId],
    enabled: !!userId && !demo,
    queryFn: () => (userId ? listDocuments(userId) : Promise.resolve([])),
  });

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !userId) return;
    const bad = validateDocFile(file);
    if (bad) return setMsg({ ok: false, text: bad });
    setBusy(true);
    setMsg(null);
    try {
      await uploadDocument(userId, docType, file);
      setMsg({ ok: true, text: "Uploaded. The GetPros team will review it." });
      if (!unified) void notifyMyDocumentsUploaded().catch(() => {});
      await qc.invalidateQueries({ queryKey: ["my-documents", userId] });
    } catch (err) {
      setMsg({
        ok: false,
        text: err instanceof Error ? err.message : "Upload failed. Please try again.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="surface-card p-5">
        <h2 className="text-lg font-black">Documents</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload the documents that apply to your business so the GetPros team can review your
          profile. Uploading does not approve your profile — a GetPros admin reviews every file.
        </p>
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Files are private: only you and GetPros admins can open them. They are never shown on your
          public profile. Please don't upload government photo IDs here.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <label className="block text-sm">
            <span className="font-semibold">Document type</span>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as DocType)}
              className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
            >
              {DOC_TYPES.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-muted-foreground">
              {DOC_TYPES.find((d) => d.id === docType)?.hint}
            </span>
          </label>
          <label
            className={`inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground ${busy || !userId || demo ? "pointer-events-none opacity-60" : ""}`}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {busy ? "Uploading…" : "Choose file"}
            <input
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={onFile}
              disabled={busy || !userId || demo}
            />
          </label>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">PDF, JPG, PNG or WebP · up to 10 MB.</p>
        {msg && (
          <p
            role="status"
            className={`mt-3 text-sm font-medium ${msg.ok ? "text-primary" : "text-destructive"}`}
          >
            {msg.text}
          </p>
        )}
      </div>

      <div className="surface-card p-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Your uploads
        </h3>
        {!demo && docs.isLoading && <Loader2 className="mt-3 h-5 w-5 animate-spin" />}
        {(demoDocs ?? docs.data)?.length === 0 && (
          <p className="mt-3 text-sm text-muted-foreground">No documents uploaded yet.</p>
        )}
        <ul className="mt-3 divide-y divide-border/60">
          {(demoDocs ?? docs.data)?.map((d) => (
            <li
              key={d.id}
              className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">{docTypeLabel(d.doc_type)}</span>
                  <DocStatus status={d.status} />
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {d.file_name} · {new Date(d.created_at).toLocaleDateString()}
                </div>
                {d.admin_note && (
                  <div className="mt-1 text-xs">Note from GetPros: {d.admin_note}</div>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={demo}
                  onClick={() =>
                    void openDocument(d).catch(() =>
                      setMsg({ ok: false, text: "Could not open the file." }),
                    )
                  }
                  className="min-h-11"
                >
                  <FileText className="h-4 w-4" /> Open
                </Button>
                {d.status === "pending" && !demo && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => {
                      try {
                        await removePendingDocument(d);
                        await qc.invalidateQueries({ queryKey: ["my-documents", userId] });
                      } catch {
                        setMsg({ ok: false, text: "Could not remove the file." });
                      }
                    }}
                    className="inline-flex min-h-11 items-center gap-1 rounded-full border border-border px-4 text-sm font-semibold hover:bg-muted"
                    aria-label={`Remove ${d.file_name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
