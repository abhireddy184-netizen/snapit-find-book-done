/**
 * Pro signup (ProSignup.tsx) copy — every visible and accessibility string in
 * English and natural US Spanish. Browser-safe. Errors are stored as keys so a
 * language switch re-renders them in the chosen language.
 */
export type SignupLang = "en" | "es";

export const SIGNUP_LANGS: readonly SignupLang[] = ["en", "es"];
export const DEFAULT_SIGNUP_LANG: SignupLang = "en";

export type SignupErrorKey =
  | "missingContact"
  | "codeInvalid"
  | "startFailed"
  | "rateLimit"
  | "resendFailed";

export type SignupCopy = {
  langGroupLabel: string;
  langNames: Record<SignupLang, string>;
  tagline: string;
  title: string;
  customerAccount: string;
  signOut: string;
  introStart: string;
  introSent: string;
  nameLabel: string;
  namePlaceholder: string;
  emailLabel: string;
  emailPlaceholder: string;
  phoneLabel: string;
  phonePlaceholder: string;
  consentBefore: string;
  terms: string;
  consentAnd: string;
  privacy: string;
  consentAfter: string;
  codeLabel: string;
  codePlaceholder: string;
  continue: string;
  verifyContinue: string;
  working: string;
  useAnotherEmail: string;
  resend: string;
  alreadyPro: string;
  resume: string;
  required: string;
  invalidEmail: string;
  consentRequired: string;
  errors: Record<SignupErrorKey, string>;
};

export const SIGNUP_COPY: Record<SignupLang, SignupCopy> = {
  en: {
    langGroupLabel: "Form language",
    langNames: { en: "English", es: "Español" },
    tagline: "No lead fees. Keep 85% of every job.",
    title: "Join GetPros as a Pro",
    customerAccount:
      "Your signed-in account is a customer account. Sign out and use your Pro account to continue.",
    signOut: "Sign out",
    introStart: "Start with your contact details. Your services and private documents come next.",
    introSent:
      "Open the secure sign-in link sent to your email. If your email includes a code, enter it below.",
    nameLabel: "Name",
    namePlaceholder: "Your full name",
    emailLabel: "Email",
    emailPlaceholder: "you@example.com",
    phoneLabel: "Phone number",
    phonePlaceholder: "(555) 123-4567",
    consentBefore: "I accept the ",
    terms: "Terms of Service",
    consentAnd: " and ",
    privacy: "Privacy Policy",
    consentAfter: ".",
    codeLabel: "Email code (if included)",
    codePlaceholder: "6-digit code",
    continue: "Continue",
    verifyContinue: "Verify & continue setup",
    working: "Please wait…",
    useAnotherEmail: "Use another email",
    resend: "Resend sign-in email",
    alreadyPro: "Already a Pro?",
    resume: "Resume your setup",
    required: "Please fill out this field.",
    invalidEmail: "Enter a valid email address.",
    consentRequired: "Please accept the Terms of Service and Privacy Policy to continue.",
    errors: {
      missingContact:
        "Enter your name, email and phone number, and accept the Terms and Privacy Policy.",
      codeInvalid:
        "That code could not be verified. Use the secure sign-in link in your email or try again.",
      startFailed: "We could not start signup. Please try again.",
      rateLimit: "Too many attempts. Please wait a minute and try again.",
      resendFailed: "We could not resend the sign-in email. Please wait a moment and try again.",
    },
  },
  es: {
    langGroupLabel: "Idioma del formulario",
    langNames: { en: "English", es: "Español" },
    tagline: "No pagas por clientes potenciales. Quédate con el 85% de cada trabajo.",
    title: "Únete a GetPros como Pro",
    customerAccount:
      "Iniciaste sesión con una cuenta de cliente. Cierra sesión y usa tu cuenta de Pro para continuar.",
    signOut: "Cerrar sesión",
    introStart:
      "Empieza con tus datos de contacto. Después agregarás tus servicios y tus documentos privados.",
    introSent:
      "Abre el enlace seguro de inicio de sesión que enviamos a tu correo. Si el correo incluye un código, escríbelo abajo.",
    nameLabel: "Nombre",
    namePlaceholder: "Tu nombre completo",
    emailLabel: "Correo electrónico",
    emailPlaceholder: "tu@ejemplo.com",
    phoneLabel: "Número de teléfono",
    phonePlaceholder: "(555) 123-4567",
    consentBefore: "Acepto los ",
    terms: "Términos del servicio",
    consentAnd: " y la ",
    privacy: "Política de privacidad",
    consentAfter: ".",
    codeLabel: "Código del correo (si lo incluye)",
    codePlaceholder: "Código de 6 dígitos",
    continue: "Continuar",
    verifyContinue: "Verificar y continuar",
    working: "Espera un momento…",
    useAnotherEmail: "Usar otro correo",
    resend: "Reenviar correo de inicio de sesión",
    alreadyPro: "¿Ya eres Pro?",
    resume: "Continúa con tu registro",
    required: "Completa este campo.",
    invalidEmail: "Escribe un correo electrónico válido.",
    consentRequired: "Acepta los Términos del servicio y la Política de privacidad para continuar.",
    errors: {
      missingContact:
        "Escribe tu nombre, correo y número de teléfono, y acepta los Términos y la Política de privacidad.",
      codeInvalid:
        "No pudimos verificar ese código. Usa el enlace seguro de inicio de sesión de tu correo o inténtalo de nuevo.",
      startFailed: "No pudimos iniciar el registro. Inténtalo de nuevo.",
      rateLimit: "Demasiados intentos. Espera un minuto y vuelve a intentarlo.",
      resendFailed:
        "No pudimos reenviar el correo de inicio de sesión. Espera un momento y vuelve a intentarlo.",
    },
  },
};

/** Same rule the form has always used before sending the sign-in email. */
export function isContactComplete(input: {
  name: string;
  email: string;
  phone: string;
  consent: boolean;
}): boolean {
  return (
    input.name.trim().length >= 2 &&
    /^\S+@\S+\.\S+$/.test(input.email.trim()) &&
    input.phone.replace(/\D/g, "").length >= 10 &&
    input.consent
  );
}

/** A form error: a translatable key, or a raw service message (shown as-is in English). */
export type SignupError = { key: SignupErrorKey; raw?: string } | null;

export function toSignupError(err: unknown, fallback: SignupErrorKey): SignupError {
  const message = err instanceof Error ? err.message : "";
  const status = (err as { status?: number } | null)?.status;
  if (status === 429 || /rate limit|too many/i.test(message)) return { key: "rateLimit" };
  return { key: fallback, raw: message || undefined };
}

export function signupErrorText(error: SignupError, lang: SignupLang): string {
  if (!error) return "";
  // Service messages are English-only; Spanish shows the translated fallback.
  if (lang === "en" && error.raw) return error.raw;
  return SIGNUP_COPY[lang].errors[error.key];
}
