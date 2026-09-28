// Server-only: internal "new lead" notification. Never throws — a failed
// notification must never affect a stored lead.
import { sendTemplateEmail } from "@/lib/email-templates/send-email";
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
};

export async function notifyNewLead(lead: LeadNotification): Promise<void> {
  try {
    const { leadId, ...templateData } = lead;
    await sendTemplateEmail("internal-lead", "", {
      templateData: { ...templateData, submittedAt: lead.submittedAt ?? new Date().toISOString() },
      idempotencyKey: `internal-lead-${lead.leadType}-${leadId}${lead.reactivated ? `-r${Date.now()}` : ""}`,
      replyTo: lead.email || undefined,
    });
  } catch (error) {
    console.error(`[lead-notify] Internal ${lead.leadType} notification failed:`, error);
  }
}
