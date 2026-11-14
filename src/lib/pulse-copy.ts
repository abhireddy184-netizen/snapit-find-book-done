/**
 * GPA Pulse chat copy — every visible string in English and Spanish, plus the
 * scripted (non-AI) replies behind the quick-action chips. Browser-safe.
 * Scripted replies are stored by key so a language switch re-renders them.
 */
import { CONTACT_EMAIL } from "./brand";

export type PulseLang = "en" | "es";

export const PULSE_LANG_KEY = "getpros-pulse-lang";

export function detectPulseLang(stored: string | null, browserLangs: readonly string[]): PulseLang {
  if (stored === "en" || stored === "es") return stored;
  return browserLangs.some((l) => l.toLowerCase().startsWith("es")) ? "es" : "en";
}

export type ScriptKey = "findPro" | "becomePro" | "proSignup" | "pro85" | "proNeeds" | "askPulse" | "error";
export type ChipKey = "findPro" | "showProblem" | "becomePro" | "askPulse" | "proSignup" | "pro85" | "proNeeds";

/** Categories offered after "Find a Pro" — slugs from src/lib/catalog.ts. */
export const PULSE_CATEGORIES = [
  { slug: "plumbing", en: "Plumbing", es: "Plomería" },
  { slug: "electrical", en: "Electrical", es: "Electricidad" },
  { slug: "cleaning", en: "House Cleaning", es: "Limpieza del hogar" },
  { slug: "hvac", en: "AC / HVAC", es: "Aire acondicionado / HVAC" },
  { slug: "handyman", en: "Handyman", es: "Reparaciones generales" },
  { slug: "appliances", en: "Appliance Repair", es: "Reparación de electrodomésticos" },
] as const;

export const PRO_SIGNUP_PATH = "/register?role=provider";

type Copy = {
  title: string;
  subtitle: string;
  online: string;
  connecting: string;
  welcome: string;
  chips: Record<ChipKey, string>;
  scripts: Record<ScriptKey, string>;
  placeholder: string;
  placeholderBusy: string;
  send: string;
  inputLabel: string;
  open: string;
  close: string;
  more: string;
  talkHuman: string;
  clear: string;
  browseAll: string;
  joinPro: string;
  retry: string;
  typing: string;
  faqBadge: string;
  disclaimer: string;
  teaserTitle: string;
  teaserBody: string;
  dismiss: string;
  quickActions: string;
  langLabel: string;
};

export const PULSE_COPY: Record<PulseLang, Copy> = {
  en: {
    title: "GPA PULSE",
    subtitle: "Your GetPros AI Assistant",
    online: "Online • Here to help",
    connecting: "Connecting…",
    welcome:
      "Hey there! 👋 I'm Pulse, your GetPros.ai assistant. Need something fixed, cleaned, installed, or improved? I'm here to help!",
    chips: {
      findPro: "🔧 Find a Pro",
      showProblem: "📸 Show My Problem",
      becomePro: "💼 Become a Pro",
      askPulse: "💬 Ask Pulse",
      proSignup: "How signup works",
      pro85: "The 85% model",
      proNeeds: "What do I need to join",
    },
    scripts: {
      findPro:
        "What do you need help with? Pick a category to see every service in it, or tell me in your own words.",
      becomePro:
        "Great choice! Joining GetPros is **free**, there are **no lead fees**, and you **keep 85% of every job**. What would you like to know?",
      proSignup:
        "Here's how it works:\n1. Tap **Join as a Pro** and enter your name, email and phone.\n2. Verify your email.\n3. Complete one setup page: your services, service area and business details.\n4. Upload any required documents and submit for review.\nOur team reviews every profile by hand before you can receive bookings.",
      pro85:
        "**Signing up is free and there are no lead fees.** You keep 85% of every job you complete through GetPros. Payouts are set up securely through Stripe once your profile is approved.",
      proNeeds:
        "To join you'll need:\n- Your name, email and phone number\n- The services you offer and the area you cover\n- Your business details, where they apply\n- Documents such as business registration or liability insurance, when your trade requires them\nPlease don't share IDs or documents in this chat — upload them securely during your Pro setup.",
      askPulse:
        "Sure! Ask me anything about GetPros — how booking works, our services, or joining as a Pro.",
      error: `I couldn't connect just now. Please try again, or reach a person at ${CONTACT_EMAIL}.`,
    },
    placeholder: "Type your message…",
    placeholderBusy: "Pulse is replying…",
    send: "Send message",
    inputLabel: "Your message",
    open: "Open GPA Pulse, the GetPros assistant",
    close: "Close chat",
    more: "More options",
    talkHuman: "Talk to a human",
    clear: "Clear conversation",
    browseAll: "Browse all services",
    joinPro: "Join as a Pro — free",
    retry: "Try again",
    typing: "Pulse is typing",
    faqBadge: "Standard answer — AI assistant unavailable",
    disclaimer: "AI answers can be wrong. Never share card details or passwords.",
    teaserTitle: "Hi there 👋 Need help?",
    teaserBody: "Ask Pulse — instant answers in English or Spanish.",
    dismiss: "Dismiss message",
    quickActions: "Quick actions",
    langLabel: "Language",
  },
  es: {
    title: "GPA PULSE",
    subtitle: "Tu asistente de IA de GetPros",
    online: "En línea • Aquí para ayudarte",
    connecting: "Conectando…",
    welcome:
      "¡Hola! 👋 Soy Pulse, tu asistente de GetPros.ai. ¿Necesitas reparar, limpiar, instalar o mejorar algo? ¡Estoy aquí para ayudarte!",
    chips: {
      findPro: "🔧 Encontrar un Pro",
      showProblem: "📸 Mostrar mi problema",
      becomePro: "💼 Ser un Pro",
      askPulse: "💬 Pregúntale a Pulse",
      proSignup: "Cómo funciona el registro",
      pro85: "El modelo del 85%",
      proNeeds: "Qué necesito para unirme",
    },
    scripts: {
      findPro:
        "¿Con qué necesitas ayuda? Elige una categoría para ver todos sus servicios, o cuéntamelo con tus propias palabras.",
      becomePro:
        "¡Excelente! Unirte a GetPros es **gratis**, **sin cargos por clientes potenciales**, y **te quedas con el 85% de cada trabajo**. ¿Qué te gustaría saber?",
      proSignup:
        "Así funciona:\n1. Toca **Únete como Pro** y escribe tu nombre, correo y teléfono.\n2. Verifica tu correo.\n3. Completa una sola página de configuración: tus servicios, tu zona de servicio y los datos de tu negocio.\n4. Sube los documentos requeridos y envíalos a revisión.\nNuestro equipo revisa cada perfil manualmente antes de que puedas recibir reservas.",
      pro85:
        "**Registrarte es gratis y no hay cargos por clientes potenciales.** Te quedas con el 85% de cada trabajo que completes con GetPros. Los pagos se configuran de forma segura con Stripe cuando tu perfil es aprobado.",
      proNeeds:
        "Para unirte necesitarás:\n- Tu nombre, correo y número de teléfono\n- Los servicios que ofreces y la zona que cubres\n- Los datos de tu negocio, cuando apliquen\n- Documentos como el registro de tu negocio o tu seguro de responsabilidad civil, cuando tu oficio lo requiera\nNo compartas identificaciones ni documentos en este chat; súbelos de forma segura durante tu configuración de Pro.",
      askPulse:
        "¡Claro! Pregúntame lo que quieras sobre GetPros: cómo reservar, nuestros servicios o cómo unirte como Pro.",
      error: `No pude conectarme en este momento. Inténtalo de nuevo o habla con una persona en ${CONTACT_EMAIL}.`,
    },
    placeholder: "Escribe tu mensaje…",
    placeholderBusy: "Pulse está respondiendo…",
    send: "Enviar mensaje",
    inputLabel: "Tu mensaje",
    open: "Abrir GPA Pulse, el asistente de GetPros",
    close: "Cerrar chat",
    more: "Más opciones",
    talkHuman: "Hablar con una persona",
    clear: "Borrar conversación",
    browseAll: "Ver todos los servicios",
    joinPro: "Únete como Pro — gratis",
    retry: "Reintentar",
    typing: "Pulse está escribiendo",
    faqBadge: "Respuesta estándar — asistente de IA no disponible",
    disclaimer: "Las respuestas de IA pueden tener errores. Nunca compartas datos de tarjeta ni contraseñas.",
    teaserTitle: "¡Hola! 👋 ¿Necesitas ayuda?",
    teaserBody: "Pregúntale a Pulse — respuestas al instante en español o inglés.",
    dismiss: "Cerrar mensaje",
    quickActions: "Acciones rápidas",
    langLabel: "Idioma",
  },
};
