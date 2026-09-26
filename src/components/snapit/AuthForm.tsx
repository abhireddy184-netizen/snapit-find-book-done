import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { User, Briefcase, Mail, Lock, ArrowRight, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Logo } from "./Logo";
import { GradientButton } from "./AppShell";
import { supabase } from "@/integrations/supabase/client";
import { PasswordChecklist } from "./PasswordChecklist";
import { passwordError } from "@/lib/password-policy";
import { startOAuth } from "@/lib/oauth-intent";
import { cn } from "@/lib/utils";

type Role = "customer" | "provider";

export function AuthForm({
  mode,
  title,
  subtitle,
  footer,
  redirectTo,
  initialRole = "customer",
}: {
  mode: "login" | "register";
  title: string;
  subtitle: string;
  footer: ReactNode;
  redirectTo?: string | undefined;
  initialRole?: Role;
}) {
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>(initialRole);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [socialBusy, setSocialBusy] = useState<string | null>(null);

  async function handleSocial(provider: "google" | "apple") {
    setError(null);
    setNotice(null);
    setSocialBusy(provider);
    try {
      const result = await startOAuth(provider, {
        role: mode === "register" ? role : null,
        redirect: redirectTo,
      });
      if (result.redirected) return;
      // Popup flow (e.g. in-editor preview): session already set.
      window.location.assign("/auth/callback");
    } catch (err) {
      setError(err instanceof Error ? err.message : `${provider} sign-in failed. Please try again.`);
      setSocialBusy(null);
    }
  }


  async function goAfterAuth(userId: string) {
    if (redirectTo && redirectTo.startsWith("/")) {
      window.location.assign(redirectTo);
      return;
    }
    const { data } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
    const target = data?.role === "provider" ? "/provider-dashboard" : "/dashboard";
    await navigate({ to: target });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (mode === "register" && fullName.trim().length < 2) {
      setError("Please enter your full name.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (mode === "register") {
      const pwIssue = passwordError(password);
      if (pwIssue) {
        setError(pwIssue);
        return;
      }
    } else if (password.length < 6) {
      setError("Please enter your password.");
      return;
    }

    setBusy(true);
    try {
      if (mode === "register") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/login`,
            data: { full_name: fullName.trim(), role },
          },
        });
        if (signUpError) throw signUpError;
        if (!data.session) {
          setNotice("Account created. Check your email to confirm your address, then log in.");
          return;
        }
        setNotice("Account created! Taking you to your dashboard…");
        await goAfterAuth(data.session.user.id);
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        setNotice("Welcome back! Loading your dashboard…");
        await goAfterAuth(data.user.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid min-h-screen max-w-6xl md:grid-cols-2">
        <aside className="relative hidden overflow-hidden p-10 text-white md:block" style={{ background: "var(--gradient-primary)" }}>
          <Logo onColor />
          <div className="mt-24">
            <h2 className="text-4xl font-black leading-tight">Show it.<br />Tell us.<br />Get it fixed.</h2>
            <p className="mt-4 max-w-sm text-white/90">
              GetPros.ai is an AI-powered services marketplace — describe or show the job, compare local pros on one
              standard scope, and keep the proof.
            </p>
          </div>
          <div className="absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        </aside>

        <main className="flex flex-col justify-start px-6 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top)+2.5rem)] md:justify-center md:px-12 md:py-10">
          <div className="mb-6 md:hidden">
            <Logo />
          </div>
          <h1 className="text-3xl font-black">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>

          {mode === "register" && (
            <>
              <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl bg-muted/60 p-1">
                <RoleTab active={role === "customer"} onClick={() => setRole("customer")} icon={User} label="Customer" />
                <RoleTab active={role === "provider"} onClick={() => setRole("provider")} icon={Briefcase} label="Service Provider" />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {role === "customer" ? "Sign up as a Customer — book trusted local pros." : "Sign up as a Service Provider — grow your business."}
              </p>
            </>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-3">
            {mode === "register" && (
              <Field icon={User} placeholder="Full name" value={fullName} onChange={setFullName} autoComplete="name" />
            )}
            <Field icon={Mail} placeholder="Email address" type="email" value={email} onChange={setEmail} autoComplete="email" />
            <Field
              icon={Lock}
              placeholder="Password"
              type="password"
              value={password}
              onChange={setPassword}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
            {mode === "register" && <PasswordChecklist value={password} />}

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-xs font-medium text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> <span>{error}</span>
              </div>
            )}
            {notice && (
              <div className="flex items-start gap-2 rounded-xl border border-mint/40 bg-mint/20 px-3 py-2.5 text-xs font-medium text-mint-ink">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> <span>{notice}</span>
              </div>
            )}

            <GradientButton type="submit" disabled={busy} className="mt-2 w-full">
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> {mode === "login" ? "Logging in…" : "Creating account…"}
                </>
              ) : (
                <>
                  {mode === "login" ? "Log in" : "Create account"} <ArrowRight className="h-4 w-4" />
                </>
              )}
            </GradientButton>
            {mode === "login" && (
              <p className="pt-1 text-center text-xs">
                <Link to="/reset-password" className="font-semibold text-primary hover:underline">
                  Forgot your password?
                </Link>
              </p>
            )}
          </form>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> or continue with <div className="h-px flex-1 bg-border" />
          </div>
          <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
            <SocialBtn provider="google" busy={socialBusy} onClick={() => void handleSocial("google")} />
            <SocialBtn provider="apple" busy={socialBusy} onClick={() => void handleSocial("apple")} />
          </div>
          {mode === "register" && (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Signing up as a {role === "provider" ? "Service Provider" : "Customer"}.
            </p>
          )}

          <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>
          <div className="mt-4 text-center text-xs text-muted-foreground">
            <Link to="/" className="hover:text-foreground">← Back to home</Link>
          </div>
        </main>
      </div>
    </div>
  );
}

function RoleTab({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all",
        active ? "bg-card text-primary shadow-sm" : "text-muted-foreground"
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="truncate">{label}</span>
    </button>
  );
}

function Field({
  icon: Icon,
  placeholder,
  type = "text",
  value,
  onChange,
  autoComplete,
}: {
  icon: React.ComponentType<{ className?: string }>;
  placeholder: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
}) {
  return (
    <label className="flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-3">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <input
        type={type}
        required
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </label>
  );
}

function SocialBtn({ provider, busy, onClick }: { provider: "google" | "apple"; busy: string | null; onClick: () => void }) {
  const label = provider === "google" ? "Google" : "Apple";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy !== null}
      className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-primary/40 hover:bg-muted/50 disabled:opacity-60"
    >
      {busy === provider ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : provider === "google" ? (
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.94l3.66-2.84z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.96 10.96 0 0 0 12 1 11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
          <path d="M16.37 12.6c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.47.83-.72 0-1.82-.81-3-.79-1.54.02-2.96.9-3.76 2.28-1.6 2.78-.41 6.9 1.15 9.16.76 1.1 1.67 2.34 2.86 2.3 1.15-.05 1.58-.74 2.97-.74 1.38 0 1.77.74 2.98.72 1.23-.02 2.01-1.12 2.76-2.23.87-1.28 1.23-2.52 1.25-2.58-.03-.01-2.4-.92-2.42-3.66zM14.1 5.84c.63-.77 1.06-1.83.94-2.89-.91.04-2.02.61-2.67 1.37-.58.67-1.09 1.76-.96 2.8 1.02.08 2.06-.52 2.69-1.28z" />
        </svg>
      )}
      Continue with {label}
    </button>
  );
}
