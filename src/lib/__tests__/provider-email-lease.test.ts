import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deliverProviderEmail } from '../provider-email-outbox.server';
const send = vi.hoisted(() => vi.fn());
vi.mock('../email-templates/send-email', () => ({ sendTemplateEmail: send }));

function fixture() {
  const row = { status: 'pending', attempts: 0, token: '', claimedAt: 0 };
  let now = 0;
  const db = {
    rpc: async () => {
      if (!['pending','failed'].includes(row.status) && !(row.status === 'sending' && now - row.claimedAt > 600000)) return { data: [] };
      row.attempts++; row.token = `lease-${row.attempts}`; row.status = 'sending'; row.claimedAt = now;
      return { data: [{ token: row.token, attempt: row.attempts }] };
    },
    from: () => {
      let token = ''; let patch: { status: string };
      const q = { update: (p: { status: string }) => { patch = p; return q; }, eq: (key: string, value: string) => { if (key === 'claim_token') token = value; return q; }, then: (resolve: (x: unknown) => void) => { if (token === row.token) Object.assign(row,patch); resolve({ error: null }); } };
      return q;
    },
  };
  return { db, row, advance: (ms: number) => { now += ms; } };
}
const deliver = (db: unknown) => deliverProviderEmail(db as never,'synthetic-only','profile_submitted','provider-setup-submitted','synthetic@example.invalid',{},'provider-profile-submitted-synthetic-only');
describe('expiring email leases with mocked delivery only', () => {
  beforeEach(() => send.mockReset());
  it('crashed worker recovers after ten minutes using the same provider idempotency key', async () => {
    const f = fixture(); await f.db.rpc();
    send.mockResolvedValue({ sent: true });
    await deliver(f.db); expect(send).not.toHaveBeenCalled();
    f.advance(600001); await deliver(f.db);
    expect(f.row.status).toBe('sent'); expect(f.row.attempts).toBe(2);
    expect(send).toHaveBeenCalledWith('provider-setup-submitted','synthetic@example.invalid',expect.objectContaining({ idempotencyKey:'provider-profile-submitted-synthetic-only' }));
  });
  it('old worker completion cannot overwrite a newer successful claim', async () => {
    const f = fixture(); let release: ((result: { sent: boolean }) => void) | undefined;
    send.mockImplementationOnce(() => new Promise(resolve => { release = resolve; })).mockResolvedValueOnce({ sent:true });
    const first = deliver(f.db); await Promise.resolve(); await Promise.resolve();
    f.advance(600001); await deliver(f.db);
    expect(f.row.status).toBe('sent'); expect(f.row.token).toBe('lease-2');
    release?.({ sent:false }); await first;
    expect(f.row.status).toBe('sent');
    expect(send.mock.calls[0]?.[2].idempotencyKey).toBe(send.mock.calls[1]?.[2].idempotencyKey);
  });
});