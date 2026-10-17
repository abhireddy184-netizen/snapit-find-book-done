import { sendTemplateEmail } from './email-templates/send-email';

type Admin = Awaited<typeof import('@/integrations/supabase/client.server')>['supabaseAdmin'];

export function developmentDeliveryBlocked() {
  return import.meta.env.DEV && import.meta.env.MODE !== 'test';
}

/** Atomic lease + fencing token. A stale worker can never finish a newer worker's claim. */
export async function deliverProviderEmail(db: Admin, userId: string, kind: string, template: string, email: string, templateData: Record<string, unknown>, idempotencyKey: string) {
  if (developmentDeliveryBlocked()) return;
  const { data, error } = await db.rpc('claim_provider_email', { _user_id: userId, _kind: kind });
  const lease = data?.[0];
  if (error || !lease) return;
  const finish = (patch: { status: string; sent_at?: string; last_error: string | null }) => db.from('provider_onboarding_emails').update(patch)
    .eq('user_id', userId).eq('kind', kind).eq('status', 'sending').eq('claim_token', lease.token);
  try {
    const result = await sendTemplateEmail(template, email, { templateData, idempotencyKey });
    await finish({ status: result.sent ? 'sent' : 'suppressed', sent_at: new Date().toISOString(), last_error: null });
  } catch (error) {
    await finish({ status: 'failed', last_error: (error instanceof Error ? error.message : String(error)).slice(0, 300) });
  }
}