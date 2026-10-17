import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { catalog } from './catalog';

const schema = z.object({
  full_name: z.string().trim().max(200), phone: z.string().trim().max(40),
  business_name: z.string().trim().max(200), business_type: z.enum(['individual', 'registered_business']),
  category_slugs: z.array(z.string()).max(40), service_slugs: z.array(z.string()).max(250),
  service_area: z.string().trim().max(300), service_zip: z.string().regex(/^(\d{5})?$/),
  service_radius_miles: z.number().int().min(1).max(200).nullable(),
  bio: z.string().max(4000), trade_license_required: z.boolean(),
}).strict().refine(d => d.category_slugs.every(s => catalog.some(c => c.slug === s)) && d.service_slugs.every(s => catalog.some(c => d.category_slugs.includes(c.slug) && c.services.some(v => v.slug === s))), 'Choose services from the GetPros catalog');

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
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: profile, error: profileError } = await context.supabase.from('profiles').select('role, is_provider').eq('id', context.userId).single();
    if (profileError || !profile || !(profile.is_provider || profile.role === 'provider')) throw new Error('Only Pro accounts can save setup.');
    const { supabaseAdmin: db } = await import('@/integrations/supabase/client.server');
    const category = catalog.find(c => c.slug === data.category_slugs[0]);
    // The UUID comes exclusively from verified auth middleware, never from client input or JWT mutation.
    const { error } = await db.rpc('save_provider_setup_for_user', { _user_id: context.userId, _data: { ...data, service_category: category?.name || null } });
    if (error) throw new Error('Your draft could not be saved. It may already be submitted. Please refresh and try again.');
    return { saved: true };
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