import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertCircle, ArrowRight, CheckCircle2, Loader2, Lock, Mail } from "lucide-react";
import { GradientButton } from "@/components/snapit/AppShell";
import { Logo } from "@/components/snapit/Logo";
import { supabase } from "@/integrations/supabase/client";
import { PasswordChecklist } from "@/components/snapit/PasswordChecklist";
import { passwordError } from "@/lib/password-policy";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset your password — GetPros" },
      { name: "description", content: "Send yourself a secure GetPros password reset link, then choose a new password." },
      { property: "og:title", content: "Reset your password — GetPros" },
      { property: "og:description", content: "Recover access to your GetPros.ai account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  // "request" = ask for the email link; "update" = we arrived from a recovery link.
  const [stage, setStage] = useState<"request" | "update">("request");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    // Supabase puts the recovery session in the URL hash and exchanges it on load.
    if (typeof window !== "undefined" && window.location.hash.includes("type=recovery")) {
      setStage("update");
    }
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY") setStage("update");
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setBusy(true);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (err) throw err;
      setNotice("If that email has a GetPros account, a reset link is on its way. Check your inbox and spam folder.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't send the reset email. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function updatePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    const pwIssue = passwordError(password);
    if (pwIssue) {
      setError(pwIssue);
      return;
    }
    if (password !== confirm) {
      setError("Both passwords must match.");
      return;
    }
    setBusy(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      setNotice("Password updated. Taking you to your dashboard…");
      await navigate({ to: "/dashboard" });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "We couldn't update the password. Request a fresh reset link and try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
        <Logo />
        <h1 className="mt-8 text-3xl font-black">
          {stage === "request" ? "Reset your password" : "Choose a new password"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {stage === "request"
            ? "Enter the email you signed up with and we'll email you a secure reset link."
            : "Your reset link is verified. Set a new password to finish."}
        </p>

        <form onSubmit={stage === "request" ? sendLink : updatePassword} className="mt-6 space-y-3">
          {stage === "request" ? (
            <ResetField icon={Mail} type="email" placeholder="Email address" value={email} onChange={setEmail} autoComplete="email" />
          ) : (
            <>
              <ResetField icon={Lock} type="password" placeholder="New password" value={password} onChange={setPassword} autoComplete="new-password" />
              <ResetField icon={Lock} type="password" placeholder="Confirm new password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
            </>
          )}

          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-xs font-medium text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> <span>{error}</span>
            </div>
          )}
          {notice && (
            <div role="status" className="flex items-start gap-2 rounded-xl border border-mint/40 bg-mint/20 px-3 py-2.5 text-xs font-medium text-mint-ink">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> <span>{notice}</span>
            </div>
          )}

          <GradientButton type="submit" disabled={busy} className="mt-2 w-full">
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Working…
              </>
            ) : (
              <>
                {stage === "request" ? "Email me a reset link" : "Save new password"} <ArrowRight className="h-4 w-4" />
              </>
            )}
          </GradientButton>
        </form>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          Remembered it?{" "}
          <Link to="/login" search={{ redirect: undefined }} className="font-semibold text-primary">
            Back to log in
          </Link>
        </div>
      </main>
    </div>
  );
}

function ResetField({
  icon: Icon,
  placeholder,
  type,
  value,
  onChange,
  autoComplete,
}: {
  icon: React.ComponentType<{ className?: string }>;
  placeholder: string;
  type: string;
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
        aria-label={placeholder}
        className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </label>
  );
}
