import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), profile: { role: 'provider', is_provider: true } }));
vi.mock('@/integrations/supabase/client.server', () => ({ supabaseAdmin: { rpc: mocks.rpc } }));
vi.mock('@/integrations/supabase/auth-middleware', () => ({ requireSupabaseAuth: {} }));
vi.mock('@tanstack/react-start', () => ({ createServerFn: () => {
  let validator: ((data: unknown) => unknown) | undefined;
  const chain = {
    middleware: () => chain,
    inputValidator: (fn: (data: unknown) => unknown) => { validator = fn; return chain; },
    handler: (fn: (args: unknown) => unknown) => (args: { data: unknown; context: unknown }) => fn({ ...args, data: validator ? validator(args.data) : args.data }),
  };
  return chain;
} }));
import { saveMyProviderSetup } from '../provider-setup.functions';

const draft = { full_name: 'Synthetic Pro', phone: '5551234567', business_name: 'Synthetic', business_type: 'individual', category_slugs: ['cleaning'], service_slugs: ['standard-cleaning'], service_area: 'Chicago', service_zip: '60601', service_radius_miles: 25, bio: 'Saved text', trade_license_required: false };
function context() {
  const q = { select: () => q, eq: () => q, single: async () => ({ data: mocks.profile, error: null }) };
  return { userId: 'authenticated-provider-a', supabase: { from: () => q } };
}
const invoke = saveMyProviderSetup as unknown as (args: { data: unknown; context: unknown }) => Promise<unknown>;
describe('secure setup server binding with isolated auth fixtures', () => {
  beforeEach(() => { mocks.rpc.mockReset(); mocks.rpc.mockResolvedValue({ error: null }); mocks.profile = { role: 'provider', is_provider: true }; });
  it('save uses only middleware identity and the service-only RPC', async () => {
    await invoke({ data: draft, context: context() });
    expect(mocks.rpc).toHaveBeenCalledWith('save_provider_setup_for_user', { _user_id: 'authenticated-provider-a', _data: { ...draft, service_category: 'Home Cleaning' } });
  });
  it('rejects forged owner UUID fields rather than forwarding them', async () => {
    expect(() => invoke({ data: { ...draft, user_id: 'victim-b' }, context: context() })).toThrow();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('customer cannot save a Pro setup or reach privileged RPC', async () => {
    mocks.profile = { role: 'customer', is_provider: false };
    await expect(invoke({ data: draft, context: context() })).rejects.toThrow('Only Pro accounts');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('database failure never reports draft saved', async () => {
    mocks.rpc.mockResolvedValue({ error: { message: 'denied' } });
    await expect(invoke({ data: draft, context: context() })).rejects.toThrow('could not be saved');
  });
});