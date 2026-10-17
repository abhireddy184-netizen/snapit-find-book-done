import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SITE_URL } from '@/lib/brand';
import { useAuth } from '@/lib/auth';
import { ensureProviderOnboardingEmail } from '@/lib/provider-profile.functions';
import { Logo } from './Logo';
import { Button } from '@/components/ui/button';

/** Passwordless Pro entry. Email ownership is verified before any private setup access. */
export function ProSignup() {
  const { user, profile, loading } = useAuth();
  const ensureWelcome = useServerFn(ensureProviderOnboardingEmail);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (loading || !user || profile?.role !== 'provider') return;
    // Idempotent server event; no messages are sent during fixture tests.
    void ensureWelcome({ data: undefined }).catch(() => {});
    window.location.replace('/provider-setup');
  }, [loading, user, profile, ensureWelcome]);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError('');
    if (!sent && (name.trim().length < 2 || !/^\S+@\S+\.\S+$/.test(email.trim()) || phone.replace(/\D/g, '').length < 10 || !consent)) {
      setError('Enter your name, email and phone number, and accept the Terms and Privacy Policy.'); return;
    }
    setBusy(true);
    try {
      if (sent) {
        const { error: verifyError } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
        if (verifyError) throw new Error('That code could not be verified. Use the secure sign-in link in your email or try again.');
        window.location.assign('/provider-setup');
      } else {
        const { error: authError } = await supabase.auth.signInWithOtp({ email: email.trim(), options: {
          emailRedirectTo: `${SITE_URL}/auth/callback?role=provider`,
          data: { full_name: name.trim(), phone: phone.trim(), role: 'provider', signup_flow: 'unified_pro', terms_accepted_at: new Date().toISOString() },
        } });
        if (authError) throw authError;
        // No claim that a user/profile exists until authentication succeeds.
        setSent(true);
      }
    } catch (err) { setError(err instanceof Error ? err.message : 'We could not start signup. Please try again.'); }
    finally { setBusy(false); }
  }

  return <div className="min-h-screen bg-background px-5 py-10 sm:py-16">
    <main className="mx-auto max-w-md">
      <Logo />
      <div className="mt-10 flex items-center gap-2 text-sm font-semibold text-primary"><CheckCircle2 className="h-4 w-4" /> No lead fees. Keep 85% of every job.</div>
      <h1 className="mt-3 text-3xl font-black">Join GetPros as a Pro</h1>
      {user && profile?.role !== 'provider' ? <div className="mt-6 border-y border-border py-6"><p>Your signed-in account is a customer account. Sign out and use your Pro account to continue.</p><Button className="mt-4 min-h-11" onClick={() => void supabase.auth.signOut()}>Sign out</Button></div> : <>
        <p className="mt-3 text-sm text-muted-foreground">{sent ? 'Open the secure sign-in link sent to your email. If your email includes a code, enter it below.' : 'Start with your contact details. Your services and private documents come next.'}</p>
        <form onSubmit={submit} className="mt-7 space-y-5">
          {!sent ? <>
            <ContactField label="Name" value={name} onChange={setName} autoComplete="name" />
            <ContactField label="Email" value={email} onChange={setEmail} autoComplete="email" type="email" />
            <ContactField label="Phone number" value={phone} onChange={setPhone} autoComplete="tel" type="tel" />
            <label className="flex items-start gap-3 text-sm text-muted-foreground"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} required className="mt-1 h-4 w-4 shrink-0 accent-primary" /><span>I accept the <Link to="/terms" className="font-semibold text-primary">Terms of Service</Link> and <Link to="/privacy" className="font-semibold text-primary">Privacy Policy</Link>.</span></label>
          </> : <ContactField label="Email code (if included)" value={code} onChange={setCode} autoComplete="one-time-code" />}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="min-h-12 w-full" disabled={busy || loading}>{busy ? <Loader2 className="animate-spin" /> : <ArrowRight />} {sent ? 'Verify & continue setup' : 'Continue'}</Button>
          {sent && <Button type="button" variant="ghost" className="min-h-11 w-full" onClick={() => { setSent(false); setCode(''); }}>Use another email</Button>}
        </form>
        <p className="mt-7 text-center text-sm text-muted-foreground">Already a Pro? <Link to="/login" search={{ next: '/provider-setup' }} className="font-semibold text-primary">Resume your setup</Link></p>
      </>}
    </main>
  </div>;
}

function ContactField({ label, value, onChange, autoComplete, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; autoComplete: string; type?: string }) {
  return <label className="block text-sm font-semibold">{label}<input className="mt-2 min-h-12 w-full rounded-md border border-input bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring" type={type} autoComplete={autoComplete} value={value} onChange={e => onChange(e.target.value)} required maxLength={200} /></label>;
}