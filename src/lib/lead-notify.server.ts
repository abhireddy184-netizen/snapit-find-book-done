// Server-only: internal "new lead" notification. Never throws — a failed
// notification must never affect a stored lead. Durable + retried via owner_notifications.
import { sendOwnerAlert } from "@/lib/owner-notify.server";
import type { LeadType } from "@/lib/email-templates/internal-lead";

export type LeadNotification = {
  leadType: LeadType;
  leadId: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  businessName?: string | null;
  service?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  location?: string | null;
  source?: string | null;
  note?: string | null;
  submittedAt?: string | null;
  reactivated?: boolean;
  yearsExperience?: number | null;
  attribution?: Record<string, string | null | undefined> | null;
};

export async function notifyNewLead(lead: LeadNotification): Promise<void> {
  const { leadId, ...templateData } = lead;
  await sendOwnerAlert(
    `internal-lead-${lead.leadType}-${leadId}${lead.reactivated ? `-r${Date.now()}` : ""}`,
    lead.leadType,
    { ...templateData, submittedAt: lead.submittedAt ?? new Date().toISOString() },
    lead.email || null,
  );
}
