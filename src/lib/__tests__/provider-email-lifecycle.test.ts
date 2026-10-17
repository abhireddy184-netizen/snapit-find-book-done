import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ensureProviderWelcome, processApprovedEmails, processProviderOnboarding } from '../provider-onboarding.server';
const send = vi.hoisted(() => vi.fn());
vi.mock('../email-templates/send-email', () => ({ sendTemplateEmail: send }));

function fixture(state = 'pending_setup', verification = 'unverified', confirmed = true) {
  const ledger = new Map<string, { kind: string; user_id: string; status: string; attempts: number; claim_token: string }>();
  const db = {
    auth: { admin: { getUserById: async () => ({ data: { user: { email: 'synthetic@example.invalid', created_at: '2026-10-17T00:00:00Z', email_confirmed_at: confirmed ? '2026-10-17T00:01:00Z' : null } } }) } },
    rpc: async (_name: string, args: { _kind: string }) => {
      const row = ledger.get(args._kind);
      if (!row || !['pending','failed'].includes(row.status)) return { data: [] };
      row.status = 'sending'; row.attempts++; row.claim_token = `token-${row.attempts}`;
      return { data: [{ token: row.claim_token, attempt: row.attempts }] };
    },
    from(table: string) {
      let kind: string | undefined; let patch: Record<string, unknown> | undefined; let token: string | undefined;
      const q: Record<string, unknown> = {};
      for (const method of ['select','or','gte','limit','in','lt']) q[method] = () => q;
      q.eq = (key: string, value: string) => { if (key === 'kind') kind = value; if (key === 'claim_token') token = value; return q; };
      q.insert = (data: { kind: string; user_id: string }) => {
        const exists = ledger.has(data.kind);
        if (!exists) ledger.set(data.kind, { ...data, status: 'pending', attempts: 0, claim_token: '' });
        return Promise.resolve({ error: exists ? { code: '23505' } : null });
      };
      q.update = (data: Record<string, unknown>) => { patch = data; return q; };
      q.maybeSingle = async () => ({ data: table === 'profiles' ? { role: 'provider', full_name: 'Synthetic' } : table === 'provider_setup' ? { state } : { business_name: 'Synthetic', verification_status: verification } });
      q.then = (resolve: (x: unknown) => void) => {
        if (patch && kind) { const row = ledger.get(kind); if (row && (!token || row.claim_token === token)) Object.assign(row, patch); }
        resolve({ data: table === 'profiles' ? [{ id: 'synthetic-only' }] : table === 'provider_onboarding_emails' ? [...ledger.values()].filter(r => !kind || r.kind === kind) : [] });
      };
      return q;
    },
  };
  return { db, ledger };
}
describe('provider lifecycle with mocked delivery, no network', () => {
  beforeEach(() => { send.mockReset(); send.mockResolvedValue({ sent: true }); vi.stubEnv('PROVIDER_APPROVED_EMAIL_ENABLED','true'); vi.spyOn(Date,'now').mockReturnValue(Date.parse('2026-10-19T00:00:00Z')); });
  it('confirmed signup welcome sends once even across duplicate entries', async () => {
    const f = fixture();
    await Promise.all([ensureProviderWelcome(f.db as never,'synthetic-only'),ensureProviderWelcome(f.db as never,'synthetic-only')]);
    expect(send).toHaveBeenCalledTimes(1); expect(f.ledger.get('welcome')?.status).toBe('sent');
  });
  it('unconfirmed email never queues welcome', async () => {
    const f = fixture('pending_setup','unverified',false);
    await ensureProviderWelcome(f.db as never,'synthetic-only');
    expect(send).not.toHaveBeenCalled(); expect(f.ledger.size).toBe(0);
  });
  it('48-hour incomplete setup gets welcome and each staged reminder once', async () => {
    const f = fixture();
    await processProviderOnboarding(f.db as never); await processProviderOnboarding(f.db as never); await processProviderOnboarding(f.db as never);
    expect([...f.ledger.keys()]).toEqual(['welcome','reminder_24h','reminder_48h']); expect(send).toHaveBeenCalledTimes(3);
  });
  it('submitted setup receives no reminders', async () => {
    const f = fixture('under_verification','pending');
    await processProviderOnboarding(f.db as never);
    expect(f.ledger.has('reminder_24h')).toBe(false); expect(f.ledger.has('reminder_48h')).toBe(false);
  });
  it('approved outbox sends once after manual verification, never for unapproved profile', async () => {
    const f = fixture('under_verification','verified');
    f.ledger.set('approved',{ kind:'approved',user_id:'synthetic-only',status:'pending',attempts:0,claim_token:'' });
    await Promise.all([processApprovedEmails(f.db as never),processApprovedEmails(f.db as never)]);
    expect(send).toHaveBeenCalledTimes(1); expect(f.ledger.get('approved')?.status).toBe('sent');
    send.mockClear(); const g = fixture();
    g.ledger.set('approved',{ kind:'approved',user_id:'synthetic-only',status:'pending',attempts:0,claim_token:'' });
    await processApprovedEmails(g.db as never); expect(send).not.toHaveBeenCalled();
  });
});