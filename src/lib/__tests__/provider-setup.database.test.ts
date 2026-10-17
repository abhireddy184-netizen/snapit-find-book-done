import { afterAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';

// All synthetic rows, auth claims and storage metadata are rolled back; no HTTP/email calls.
const url = process.env['SUPABASE_DB_URL'];
const sql = url ? postgres(url, { max: 1, prepare: false }) : null;
const capability = sql ? await sql`SELECT has_schema_privilege(current_user,'auth','USAGE') AS auth_access` : [];
const canCreateIsolatedUsers = capability[0]?.auth_access === true;
afterAll(async () => { if (sql) await sql.end(); });
const draft = { full_name: 'Synthetic Pro', phone: '5551234567', business_name: 'Synthetic Services', business_type: 'individual', category_slugs: ['cleaning'], service_slugs: ['standard-cleaning'], service_category: 'Cleaning', service_area: 'Chicago', service_zip: '60601', service_radius_miles: 25, bio: '', trade_license_required: false };

async function isolated(check: (tx: postgres.TransactionSql, id: string) => Promise<void>) {
  if (!sql) throw new Error('Rollback-only database connection unavailable');
  const id = crypto.randomUUID();
  try {
    await sql.begin(async tx => {
      await tx`INSERT INTO auth.users(id, email, raw_user_meta_data, created_at) VALUES(${id}, ${`${id}@example.invalid`}, '{"role":"provider","signup_flow":"unified_pro","full_name":"Synthetic Pro","phone":"5551234567"}'::jsonb, '2020-01-01')`;
      await tx`SELECT set_config('request.jwt.claims', ${JSON.stringify({ role: 'service_role' })}, true), set_config('request.jwt.claim.role','service_role',true)`;
      await check(tx, id);
      throw new Error('ROLLBACK_SYNTHETIC_FIXTURE');
    });
  } catch (error) {
    if (!(error instanceof Error) || error.message !== 'ROLLBACK_SYNTHETIC_FIXTURE') throw error;
  }
}

describe.skipIf(!canCreateIsolatedUsers)('applied provider setup database safeguards (rollback only)', () => {
  it('same signup initializes one setup; service save preserves JWT subject and resumes draft', async () => isolated(async (tx, id) => {
    const [before] = await tx`SELECT current_setting('request.jwt.claim.sub',true) AS sub`;
    await tx`SELECT public.save_provider_setup_for_user(${id}::uuid,${JSON.stringify(draft)}::jsonb)`;
    await tx`SELECT public.save_provider_setup_for_user(${id}::uuid,${JSON.stringify({ ...draft, bio: 'Saved draft' })}::jsonb)`;
    const [row] = await tx`SELECT count(*)::int AS count,max(state) AS state FROM public.provider_setup WHERE user_id=${id}`;
    const [after] = await tx`SELECT current_setting('request.jwt.claim.sub',true) AS sub`;
    expect(row.count).toBe(1); expect(row.state).toBe('pending_setup'); expect(after.sub).toBe(before.sub);
    const [p] = await tx`SELECT bio FROM public.provider_profiles WHERE user_id=${id}`;
    expect(p.bio).toBe('Saved draft');
  }));
  it('anonymous and authenticated users cannot execute privileged save or claims', async () => isolated(async tx => {
    const [row] = await tx`SELECT has_function_privilege('authenticated','public.save_provider_setup_for_user(uuid,jsonb)','execute') AS save,has_function_privilege('anon','public.claim_provider_email(uuid,text)','execute') AS claim,has_function_privilege('authenticated','public.save_my_provider_setup(jsonb)','execute') AS legacy`;
    expect(row.save).toBe(false); expect(row.claim).toBe(false); expect(row.legacy).toBe(false);
  }));
  it('missing stored documents prevents submit; upload alone creates no outbox; explicit submission is atomic and repeat-safe', async () => isolated(async (tx, id) => {
    await tx`SELECT public.save_provider_setup_for_user(${id}::uuid,${JSON.stringify(draft)}::jsonb)`;
    await tx`SELECT set_config('request.jwt.claims',${JSON.stringify({ sub: id, role: 'authenticated' })},true),set_config('request.jwt.claim.sub',${id},true),set_config('request.jwt.claim.role','authenticated',true)`;
    const [missing] = await tx`SELECT public.submit_my_provider_setup() AS result`;
    expect(missing.result).toEqual({ submitted: false, missing: ['liability insurance'] });
    const path = `${id}/synthetic.pdf`;
    await tx`INSERT INTO storage.objects(bucket_id,name) VALUES('provider-documents',${path})`;
    await tx`INSERT INTO public.provider_documents(user_id,doc_type,storage_path,file_name,mime_type,size_bytes) VALUES(${id},'liability_insurance',${path},'synthetic.pdf','application/pdf',100)`;
    const [early] = await tx`SELECT count(*)::int AS count FROM public.provider_onboarding_emails WHERE user_id=${id}`;
    expect(early.count).toBe(0);
    const [submitted] = await tx`SELECT public.submit_my_provider_setup() AS result`;
    expect(submitted.result).toEqual({ submitted: true, missing: [] });
    await tx`SELECT public.submit_my_provider_setup()`;
    const [row] = await tx`SELECT count(*)::int AS count,max(status) AS status FROM public.provider_onboarding_emails WHERE user_id=${id} AND kind='profile_submitted'`;
    const [profile] = await tx`SELECT verification_status FROM public.provider_profiles WHERE user_id=${id}`;
    expect(row.count).toBe(1); expect(row.status).toBe('pending'); expect(profile.verification_status).toBe('pending');
  }));
  it('lease blocks duplicate workers, recovers after ten minutes, and fences the old worker', async () => isolated(async (tx,id) => {
    await tx`INSERT INTO public.provider_onboarding_emails(user_id,kind) VALUES(${id},'profile_submitted')`;
    const first = await tx`SELECT * FROM public.claim_provider_email(${id}::uuid,'profile_submitted')`;
    const duplicate = await tx`SELECT * FROM public.claim_provider_email(${id}::uuid,'profile_submitted')`;
    expect(first).toHaveLength(1); expect(duplicate).toHaveLength(0);
    await tx`UPDATE public.provider_onboarding_emails SET claimed_at=now()-interval '11 minutes' WHERE user_id=${id}`;
    const second = await tx`SELECT * FROM public.claim_provider_email(${id}::uuid,'profile_submitted')`;
    expect(second[0].attempt).toBe(2); expect(second[0].token).not.toBe(first[0].token);
    const stale = await tx`UPDATE public.provider_onboarding_emails SET status='sent' WHERE user_id=${id} AND claim_token=${first[0].token}::uuid RETURNING user_id`;
    expect(stale).toHaveLength(0);
  }));
  it('admin approval queues one approved email only on a real transition', async () => isolated(async (tx,id) => {
    await tx`SELECT public.save_provider_setup_for_user(${id}::uuid,${JSON.stringify(draft)}::jsonb)`;
    await tx`INSERT INTO public.user_roles(user_id,role) VALUES(${id},'admin')`;
    await tx`SELECT set_config('request.jwt.claims',${JSON.stringify({ sub: id, role: 'authenticated' })},true),set_config('request.jwt.claim.sub',${id},true),set_config('request.jwt.claim.role','authenticated',true)`;
    await tx`SELECT public.admin_set_provider_verification(${id}::uuid,'verified')`;
    await tx`SELECT public.admin_set_provider_verification(${id}::uuid,'verified')`;
    const [row] = await tx`SELECT count(*)::int AS count,max(status) AS status FROM public.provider_onboarding_emails WHERE user_id=${id} AND kind='approved'`;
    expect(row.count).toBe(1); expect(row.status).toBe('pending');
  }));
});

describe.skipIf(!sql)('applied RPC privilege boundaries (read only)', () => {
  it('privileged save and email leases reject client roles, submission remains authenticated', async () => {
    if (!sql) throw new Error('Database unavailable');
    const [row] = await sql`SELECT has_function_privilege('authenticated','public.save_provider_setup_for_user(uuid,jsonb)','execute') AS save,has_function_privilege('anon','public.claim_provider_email(uuid,text)','execute') AS claim,has_function_privilege('authenticated','public.submit_my_provider_setup()','execute') AS submit`;
    expect(row.save).toBe(false); expect(row.claim).toBe(false); expect(row.submit).toBe(true);
  });
});