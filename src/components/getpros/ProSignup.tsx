import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SITE_URL } from "@/lib/brand";
import { useAuth } from "@/lib/auth";
import { ensureProviderOnboardingEmail } from "@/lib/provider-profile.functions";
import {
  DEFAULT_SIGNUP_LANG,
  SIGNUP_COPY,
  SIGNUP_LANGS,
  isContactComplete,
  signupErrorText,
  toSignupError,
  type SignupError,
  type SignupLang,
} from "@/lib/pro-signup-copy";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";

/** Passwordless Pro entry. Email ownership is verified before any private setup access. */
export function ProSignup() {
  const { user, profile, loading } = useAuth();
  const ensureWelcome = useServerFn(ensureProviderOnboardingEmail);
  // Language is display-only: switching never touches the entered values below.
  const [lang, setLang] = useState<SignupLang>(DEFAULT_SIGNUP_LANG);
  const t = SIGNUP_COPY[lang];
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<SignupError>(null);
  useEffect(() => {
    if (loading || !user || profile?.role !== "provider") return;
    // Idempotent server event; no messages are sent during fixture tests.
    void ensureWelcome({ data: undefined }).catch(() => {});
    window.location.replace("/provider-setup");
  }, [loading, user, profile, ensureWelcome]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!sent && !isContactComplete({ name, email, phone, consent })) {
      setError({ key: "missingContact" });
      return;
    }
    setBusy(true);
    try {
      if (sent) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          email: email.trim(),
          token: code.trim(),
          type: "email",
        });
        if (verifyError) {
          setError({ key: "codeInvalid" });
          return;
        }
        window.location.assign("/provider-setup");
      } else {
        const { error: authError } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: {
            emailRedirectTo: `${SITE_URL}/auth/callback?role=provider`,
            data: {
              full_name: name.trim(),
              phone: phone.trim(),
              role: "provider",
              signup_flow: "unified_pro",
              terms_accepted_at: new Date().toISOString(),
            },
          },
        });
        if (authError) throw authError;
        // No claim that a user/profile exists until authentication succeeds.
        setSent(true);
      }
    } catch (err) {
      setError(toSignupError(err, "startFailed"));
    } finally {
      setBusy(false);
    }
  }

  const errorText = signupErrorText(error, lang);

  return (
    <div lang={lang} className="min-h-screen bg-background px-5 py-10 sm:py-16">
      <main className="mx-auto max-w-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Logo />
          <div
            role="group"
            aria-label={t.langGroupLabel}
            className="inline-flex rounded-full border border-border bg-muted p-0.5 text-sm font-semibold"
          >
            {SIGNUP_LANGS.map((l) => (
              <button
                key={l}
                type="button"
                lang={l}
                aria-pressed={lang === l}
                onClick={() => setLang(l)}
                className={cn(
                  "min-h-10 min-w-[5.5rem] rounded-full px-3.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  lang === l
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t.langNames[l]}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-10 flex items-start gap-2 text-sm font-semibold text-primary">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {t.tagline}
        </div>
        <h1 className="mt-3 text-3xl font-black">{t.title}</h1>
        {user && profile?.role !== "provider" ? (
          <div className="mt-6 border-y border-border py-6">
            <p>{t.customerAccount}</p>
            <Button className="mt-4 min-h-11" onClick={() => void supabase.auth.signOut()}>
              {t.signOut}
            </Button>
          </div>
        ) : (
          <>
            <p className="mt-3 text-sm text-muted-foreground">
              {sent ? t.introSent : t.introStart}
            </p>
            <form onSubmit={submit} className="mt-7 space-y-5">
              {!sent ? (
                <>
                  <ContactField
                    label={t.nameLabel}
                    placeholder={t.namePlaceholder}
                    requiredMessage={t.required}
                    value={name}
                    onChange={setName}
                    autoComplete="name"
                  />
                  <ContactField
                    label={t.emailLabel}
                    placeholder={t.emailPlaceholder}
                    requiredMessage={t.required}
                    invalidMessage={t.invalidEmail}
                    value={email}
                    onChange={setEmail}
                    autoComplete="email"
                    type="email"
                  />
                  <ContactField
                    label={t.phoneLabel}
                    placeholder={t.phonePlaceholder}
                    requiredMessage={t.required}
                    value={phone}
                    onChange={setPhone}
                    autoComplete="tel"
                    type="tel"
                  />
                  <label className="flex items-start gap-3 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => {
                        e.currentTarget.setCustomValidity("");
                        setConsent(e.target.checked);
                      }}
                      onInvalid={(e) => e.currentTarget.setCustomValidity(t.consentRequired)}
                      required
                      className="mt-1 h-4 w-4 shrink-0 accent-primary"
                    />
                    <span>
                      {t.consentBefore}
                      <Link to="/terms" className="font-semibold text-primary">
                        {t.terms}
                      </Link>
                      {t.consentAnd}
                      <Link to="/privacy" className="font-semibold text-primary">
                        {t.privacy}
                      </Link>
                      {t.consentAfter}
                    </span>
                  </label>
                </>
              ) : (
                <ContactField
                  label={t.codeLabel}
                  placeholder={t.codePlaceholder}
                  requiredMessage={t.required}
                  value={code}
                  onChange={setCode}
                  autoComplete="one-time-code"
                />
              )}
              {errorText && (
                <p role="alert" className="text-sm text-destructive">
                  {errorText}
                </p>
              )}
              <Button
                type="submit"
                className="min-h-12 w-full whitespace-normal text-center"
                disabled={busy || loading}
              >
                {busy ? (
                  <>
                    <Loader2 className="animate-spin" aria-hidden />
                    <span className="sr-only">{t.working}</span>
                  </>
                ) : (
                  <ArrowRight aria-hidden />
                )}{" "}
                {sent ? t.verifyContinue : t.continue}
              </Button>
              {sent && (
                <Button
                  type="button"
                  variant="ghost"
                  className="min-h-11 w-full whitespace-normal"
                  onClick={() => {
                    setSent(false);
                    setCode("");
                  }}
                >
                  {t.useAnotherEmail}
                </Button>
              )}
              {sent && (
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 w-full whitespace-normal"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    setError(null);
                    try {
                      const { error } = await supabase.auth.signInWithOtp({
                        email: email.trim(),
                        options: {
                          shouldCreateUser: false,
                          emailRedirectTo: `${SITE_URL}/auth/callback?role=provider`,
                        },
                      });
                      if (error) throw error;
                    } catch {
                      setError({ key: "resendFailed" });
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {t.resend}
                </Button>
              )}
            </form>
            <p className="mt-7 text-center text-sm text-muted-foreground">
              {t.alreadyPro}{" "}
              <Link
                to="/login"
                search={{ next: "/provider-setup" }}
                className="font-semibold text-primary"
              >
                {t.resume}
              </Link>
            </p>
          </>
        )}
      </main>
    </div>
  );
}

function ContactField({
  label,
  value,
  onChange,
  autoComplete,
  placeholder,
  requiredMessage,
  invalidMessage,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  placeholder: string;
  requiredMessage: string;
  invalidMessage?: string;
  type?: string;
}) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <input
        className="mt-2 min-h-12 w-full rounded-md border border-input bg-background px-3 font-normal outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          // Clear the translated browser message so the browser re-checks the field.
          e.currentTarget.setCustomValidity("");
          onChange(e.target.value);
        }}
        onInvalid={(e) => {
          const el = e.currentTarget;
          el.setCustomValidity(
            el.validity.valueMissing ? requiredMessage : (invalidMessage ?? requiredMessage),
          );
        }}
        required
        maxLength={200}
      />
    </label>
  );
}
