import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type { SnapAnalysis } from "./snap-analyze.functions";
import { createDemoQuotes } from "./booking-actions.functions";

export type Job = Database["public"]["Tables"]["service_requests"]["Row"];
export type JobStatus = Database["public"]["Enums"]["job_status"];
export type Quote = Database["public"]["Tables"]["provider_quotes"]["Row"];
export type JobDocument = Database["public"]["Tables"]["job_documents"]["Row"];
export type VerificationResult = Database["public"]["Enums"]["verification_result"];

export const JOB_STATUS_FLOW: { id: JobStatus; label: string }[] = [
  { id: "diagnosed", label: "Diagnosed" },
  { id: "pending_match", label: "Matching a pro" },
  { id: "quotes_requested", label: "Quotes requested" },
  { id: "booked", label: "Booked" },
  { id: "in_progress", label: "In progress" },
  { id: "needs_verification", label: "Needs verification" },
  { id: "completed", label: "Completed" },
];

export const JOB_STATUS_STYLE: Record<JobStatus, string> = {
  diagnosed: "bg-primary/10 text-primary",
  pending_match: "bg-amber-100 text-amber-700",
  quotes_requested: "bg-amber-100 text-amber-700",
  booked: "bg-mint/25 text-mint-ink",
  in_progress: "bg-sky/25 text-sky-ink",
  needs_verification: "bg-orange-100 text-orange-700",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-muted text-muted-foreground",
};

export function jobStatusLabel(status: JobStatus): string {
  return JOB_STATUS_FLOW.find((s) => s.id === status)?.label ?? "Cancelled";
}

export const VERIFICATION_COPY: Record<VerificationResult, { label: string; tone: string }> = {
  not_started: { label: "Not checked yet", tone: "bg-muted text-muted-foreground" },
  pending: { label: "Checking…", tone: "bg-amber-100 text-amber-700" },
  appears_completed: { label: "Appears completed", tone: "bg-mint/25 text-mint-ink" },
  needs_manual_review: { label: "Needs manual review", tone: "bg-orange-100 text-orange-700" },
  unable_to_verify: { label: "Unable to verify", tone: "bg-muted text-muted-foreground" },
};

/* ---------------- media helpers ---------------- */

export async function compressDataUrl(dataUrl: string, maxSize = 1280, quality = 0.8): Promise<string> {
  if (typeof window === "undefined") return dataUrl;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(dataUrl);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, b64] = dataUrl.split(",");
  const mime = /:(.*?);/.exec(meta ?? "")?.[1] ?? "image/jpeg";
  const bin = atob(b64 ?? "");
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export async function uploadJobMedia(userId: string, dataUrl: string, label: string): Promise<string> {
  const compressed = await compressDataUrl(dataUrl);
  const path = `${userId}/${Date.now()}-${label}.jpg`;
  const { error } = await supabase.storage
    .from("job-media")
    .upload(path, dataUrlToBlob(compressed), { contentType: "image/jpeg", upsert: true });
  if (error) throw error;
  return path;
}

export async function signedMediaUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from("job-media").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

export async function mediaAsDataUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from("job-media").download(path);
  if (error || !data) return null;
  return await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(data);
  });
}

/* ---------------- standardized scope ---------------- */

export function buildScopeOfWork(analysis: SnapAnalysis): string[] {
  const base = [
    ...(analysis.recommendedActions ?? []),
    ...(analysis.nextSteps ?? []),
  ].filter(Boolean);
  const unique = Array.from(new Set(base)).slice(0, 6);
  if (unique.length > 0) return unique;
  return [
    "On-site inspection and diagnosis",
    "Carry out the repair or service required",
    "Test and confirm the issue is resolved",
    "Clean up the work area",
  ];
}

export function buildSafetySteps(analysis: SnapAnalysis): string[] {
  return (analysis.recommendedActions ?? []).slice(0, 4);
}

/* ---------------- CRUD ---------------- */

export async function createJobFromAnalysis(params: {
  customerId: string;
  analysis: SnapAnalysis;
  imageDataUrl?: string | null;
  note?: string;
  /** "Request a pro" details, when no verified pro covers the ZIP yet. */
  request?: { address: string; date: string; window: string; phone: string };
}): Promise<Job> {
  const { customerId, analysis, imageDataUrl, note, request } = params;
  let beforePath: string | null = null;
  if (imageDataUrl) {
    try {
      beforePath = await uploadJobMedia(customerId, imageDataUrl, "before");
    } catch {
      beforePath = null;
    }
  }

  const { data, error } = await supabase
    .from("service_requests")
    .insert({
      customer_id: customerId,
      category_slug: analysis.categorySlug,
      category_label: analysis.category,
      problem_statement: analysis.problem,
      scope_of_work: buildScopeOfWork(analysis),
      safety_steps: buildSafetySteps(analysis),
      urgency: analysis.urgency,
      estimated_minutes: analysis.estimatedDurationMinutes ?? 60,
      expected_price_low: analysis.estimatedCostLow ?? 0,
      expected_price_high: analysis.estimatedCostHigh ?? 0,
      customer_note: note ?? "",
      ai_confidence: analysis.confidence ?? null,
      ai_diagnosis: analysis as unknown as Database["public"]["Tables"]["service_requests"]["Insert"]["ai_diagnosis"],
      before_image_path: beforePath,
      status: request ? "pending_match" : "diagnosed",
      ...(request
        ? {
            service_address: request.address,
            preferred_date: request.date,
            preferred_window: request.window,
            preferred_time: request.window,
            contact_phone: request.phone,
          }
        : {}),
    })
    .select("*")
    .single();
  if (error) throw error;

  if (beforePath) {
    await supabase.from("job_documents").insert({
      job_id: data.id,
      customer_id: customerId,
      kind: "before_photo",
      title: "Before photo",
      storage_path: beforePath,
    });
  }
  return data;
}

export async function fetchJobs(customerId: string): Promise<Job[]> {
  const { data, error } = await supabase
    .from("service_requests")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchJob(id: string): Promise<Job | null> {
  const { data, error } = await supabase.from("service_requests").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateJob(id: string, patch: Database["public"]["Tables"]["service_requests"]["Update"]) {
  const { data, error } = await supabase.from("service_requests").update(patch).eq("id", id).select("*").single();
  if (error) throw error;
  return data;
}

export async function fetchQuotes(jobId: string): Promise<Quote[]> {
  const { data, error } = await supabase
    .from("provider_quotes")
    .select("*")
    .eq("job_id", jobId)
    .order("price", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchJobDocuments(jobId: string): Promise<JobDocument[]> {
  const { data, error } = await supabase
    .from("job_documents")
    .select("*")
    .eq("job_id", jobId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function acceptQuote(jobId: string, quoteId: string) {
  await supabase.from("provider_quotes").update({ status: "declined" }).eq("job_id", jobId).neq("id", quoteId);
  const { error } = await supabase.from("provider_quotes").update({ status: "accepted" }).eq("id", quoteId);
  if (error) throw error;
  await updateJob(jobId, { accepted_quote_id: quoteId });
}

/**
 * Demo/foundation only: generates sample quotes against the standardized scope so the
 * comparison experience can be used before real pros are onboarded. Every row is
 * flagged is_demo = true and labelled as demo data in the UI.
 */
export async function seedDemoQuotes(job: Job, pros: { name: string; availability: string; warranty: string }[]) {
  await createDemoQuotes({ data: { jobId: job.id, pros: pros.slice(0, 3) } });
}

export function quoteRangeVerdict(price: number, low: number, high: number) {
  if (!high) return { label: "No benchmark", tone: "bg-muted text-muted-foreground" };
  if (price < low * 0.85) return { label: "Below expected range", tone: "bg-amber-100 text-amber-700" };
  if (price <= high) return { label: "Within expected range", tone: "bg-mint/25 text-mint-ink" };
  return { label: "Above expected range", tone: "bg-orange-100 text-orange-700" };
}

export function money(value: number | string, currency = "USD") {
  const n = Number(value);
  return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 0 }).format(
    Number.isFinite(n) ? n : 0,
  );
}