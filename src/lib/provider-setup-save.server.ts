import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { providerSetupSchema } from './provider-setup-schema';
import { catalog } from './catalog';

export async function saveBoundProviderSetup(context: { userId: string; supabase: SupabaseClient<Database> }, input: unknown) {
  const data = providerSetupSchema.parse(input);
  const { data: profile, error: profileError } = await context.supabase.from('profiles').select('role, is_provider').eq('id', context.userId).single();
  if (profileError || !profile || !(profile.is_provider || profile.role === 'provider')) throw new Error('Only Pro accounts can save setup.');
  const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server');
  const category = catalog.find(c => c.slug === data.category_slugs[0]);
  const { error } = await db.rpc('save_provider_setup_for_user', { _user_id: context.userId, _data: { ...data, service_category: category?.name || null } });
  if (error) throw new Error('Your draft could not be saved. It may already be submitted. Please refresh and try again.');
  return { saved: true };
}