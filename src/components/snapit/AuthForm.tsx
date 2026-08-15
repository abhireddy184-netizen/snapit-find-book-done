import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { User, Briefcase, Mail, Lock, ArrowRight, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Logo } from "./Logo";
import { GradientButton } from "./AppShell";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Role = "customer" | "provider";

export function AuthForm({
  mode,
  title,
  subtitle,
  footer,
  redirectTo,
}: {
  mode: "login" | "register";
  title: string;
  subtitle: string;
  footer: ReactNode;
  redirectTo?: string | undefined;
}) {
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>("customer");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
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
            <h2 className="text-4xl font-black leading-tight">Snap it.<br />Book it.<br />Done.</h2>
            <p className="mt-4 max-w-sm text-white/90">Built to connect customers with trusted local pros — AI-powered service matching from a single photo.</p>
          </div>
          <div className="absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        </aside>

        <main className="flex flex-col justify-center px-6 py-10 md:px-12">
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
          </form>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> or continue with <div className="h-px flex-1 bg-border" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <SocialBtn label="Google" />
            <SocialBtn label="Apple" />
          </div>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">Social sign-in is coming soon.</p>

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

function SocialBtn({ label }: { label: string }) {
  return (
    <button
      type="button"
      disabled
      title="Coming soon"
      className="rounded-xl border border-border bg-background py-2.5 text-sm font-semibold text-muted-foreground opacity-60"
    >
      {label} <span className="text-[10px] font-normal">· soon</span>
    </button>
  );
}
