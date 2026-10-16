// Client helpers for private provider onboarding documents.
// Files live in the private "provider-documents" bucket under <userId>/...; access is
// enforced by database policies (owner + admins only). Downloads use short-lived signed URLs.
import { supabase } from "@/integrations/supabase/client";

export const DOC_BUCKET = "provider-documents";
export const MAX_DOC_BYTES = 10 * 1024 * 1024;
export const ALLOWED_DOC_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type DocType = "business_registration" | "liability_insurance" | "trade_license" | "other";
export const DOC_TYPES: { id: DocType; label: string; hint: string }[] = [
  { id: "business_registration", label: "Business registration", hint: "e.g. state business filing or local business tax receipt" },
  { id: "liability_insurance", label: "Liability insurance certificate", hint: "Certificate of insurance showing your business name and dates" },
  { id: "trade_license", label: "Trade / electrical license", hint: "Any license that applies to the work you offer (for example electrical work)" },
  { id: "other", label: "Other supporting document", hint: "Anything else the GetPros team asked for" },
];
export const docTypeLabel = (t: string) => DOC_TYPES.find((d) => d.id === t)?.label ?? t;

export type ProviderDocument = {
  id: string; user_id: string; doc_type: string; storage_path: string; file_name: string;
  mime_type: string; size_bytes: number; status: "pending" | "accepted" | "rejected";
  admin_note: string | null; reviewed_at: string | null; created_at: string;
};

const COLS = "id, user_id, doc_type, storage_path, file_name, mime_type, size_bytes, status, admin_note, reviewed_at, created_at";

export function validateDocFile(file: File): string | null {
  if (!ALLOWED_DOC_TYPES[file.type]) return "Please upload a PDF, JPG, PNG or WebP file.";
  if (file.size <= 0) return "This file is empty.";
  if (file.size > MAX_DOC_BYTES) return "Files must be 10 MB or smaller.";
  return null;
}

export async function listDocuments(userId: string): Promise<ProviderDocument[]> {
  const { data, error } = await supabase.from("provider_documents").select(COLS).eq("user_id", userId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ProviderDocument[];
}

export async function uploadDocument(userId: string, docType: DocType, file: File) {
  const bad = validateDocFile(file);
  if (bad) throw new Error(bad);
  const path = `${userId}/${crypto.randomUUID()}.${ALLOWED_DOC_TYPES[file.type]}`;
  const up = await supabase.storage.from(DOC_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (up.error) throw up.error;
  const { error } = await supabase.from("provider_documents").insert({
    user_id: userId, doc_type: docType, storage_path: path,
    file_name: file.name.slice(0, 200) || "document", mime_type: file.type, size_bytes: file.size,
  });
  if (error) {
    await supabase.storage.from(DOC_BUCKET).remove([path]);
    throw error;
  }
}

export async function removePendingDocument(doc: ProviderDocument) {
  const { error } = await supabase.from("provider_documents").delete().eq("id", doc.id).eq("status", "pending");
  if (error) throw error;
  await supabase.storage.from(DOC_BUCKET).remove([doc.storage_path]);
}

/** 60-second signed link; only works for the owner or an admin (storage policies). */
export async function openDocument(doc: ProviderDocument) {
  const { data, error } = await supabase.storage.from(DOC_BUCKET).createSignedUrl(doc.storage_path, 60);
  if (error || !data) throw error ?? new Error("Could not open file.");
  window.open(data.signedUrl, "_blank", "noopener,noreferrer");
}
