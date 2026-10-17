import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { providerSetupSchema } from './provider-setup-schema';

export const getMyProviderSetup = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile, error } = await context.supabase.from('profiles').select('full_name, phone, role, is_provider').eq('id', context.userId).single();
    if (error || !profile || !(profile.is_provider || profile.role === 'provider')) throw new Error('This setup is for Pro accounts. Please sign in with your Pro account.');
    const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server');
    const { data: auth } = await context.supabase.auth.getUser();
    const [{ data: pp }, { data: existing }] = await Promise.all([
      db.from('provider_profiles').select('*').eq('user_id', context.userId).maybeSingle(),
      context.supabase.from('provider_setup').select('*').eq('user_id', context.userId).maybeSingle(),
    ]);
    // Explicit setup entry, never backfill existing profiles or change their ownership/status.
    if (!existing && pp?.verification_status !== 'verified' && pp?.verification_status !== 'pending') {
      const { error: createError } = await db.from('provider_setup').upsert({ user_id: context.userId, full_name: profile.full_name, phone: profile.phone || String(auth.user?.user_metadata['phone'] || '') }, { onConflict: 'user_id', ignoreDuplicates: true });
      if (createError) throw new Error('We could not start your setup. Please try again.');
    }
    const { data: setup, error: setupError } = await context.supabase.from('provider_setup').select('*').eq('user_id', context.userId).maybeSingle();
    if (setupError) throw new Error('We could not load your saved setup.');
    return { setup, profile, provider: pp, email: auth.user?.email || '', userId: context.userId };
  });

export const saveMyProviderSetup = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => providerSetupSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { saveBoundProviderSetup } = await import('./provider-setup-save.server');
    return saveBoundProviderSetup(context, data);
  });

export const submitMyProviderSetup = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ submitted: boolean; missing: string[] }> => {
    const { data, error } = await context.supabase.rpc('submit_my_provider_setup');
    if (error) throw new Error('We could not submit your setup. Please try again.');
    const result = z.object({ submitted: z.boolean(), missing: z.array(z.string()) }).parse(data);
    if (result.submitted) {
      // The transaction queued the email before returning; fast path plus existing hourly retry.
      const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server');
      const { processUnifiedSubmissionEmails } = await import('./provider-onboarding.server');
      await processUnifiedSubmissionEmails(db, context.userId);
    }
    return result;
  });