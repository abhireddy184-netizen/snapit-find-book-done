import React from 'react'
import { Body, Button, Column, Container, Head, Heading, Html, Img, Preview, Row, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { EmailFooter, EmailHeader, EmailVideoSlot, SITE_URL, SUPPORT_EMAIL, emailStyles } from './brand'
import { BRAND_COLORS } from '@/lib/brand'
import plumbingPhoto from '@/assets/email/getpros-email-plumbing.jpg.asset.json'
import hvacPhoto from '@/assets/email/getpros-email-hvac.jpg.asset.json'
import handymanPhoto from '@/assets/email/getpros-email-handyman.jpg.asset.json'
import cleaningPhoto from '@/assets/email/getpros-email-cleaning.jpg.asset.json'

/**
 * Pro welcome (right after signup) and 24h/48h reminders — one bilingual
 * English + US Spanish email. Photos are licensed real photographs (Pexels
 * licence) hosted on the site's asset CDN, referenced by absolute HTTPS URLs.
 */

interface Props {
  name?: string
  siteUrl?: string
  variant?: 'welcome' | 'reminder'
}

const PHOTOS = [
  { src: plumbingPhoto.url, en: 'Plumbing', es: 'Plomería' },
  { src: hvacPhoto.url, en: 'Heating & cooling', es: 'Calefacción y aire' },
  { src: handymanPhoto.url, en: 'Handyman', es: 'Reparaciones' },
  { src: cleaningPhoto.url, en: 'Cleaning', es: 'Limpieza' },
]

const copy = {
  en: {
    welcomeHeading: (n?: string) => (n ? `Welcome to GetPros, ${n}` : 'Welcome to GetPros'),
    reminderHeading: (n?: string) => (n ? `${n}, your GetPros profile is almost done` : 'Your GetPros profile is almost done'),
    welcomeIntro: 'Your Pro account is ready. Finish your setup and send your profile for review.',
    reminderIntro: "A friendly reminder: your profile hasn't been sent for review yet.",
    status: 'Status: setup not submitted yet',
    stepsTitle: 'Your next steps',
    steps: [
      'Add your services, service city, ZIP code, travel radius and business details.',
      'No credential uploads are required for basic profile review. You may optionally upload business registration, liability insurance or a trade license privately in setup. Service-specific license and insurance requirements still apply before doing that work.',
      "Submit your profile. Our team reviews it. You can't be listed or booked until GetPros approves you.",
      'After approval, set up payouts before you take paid bookings.',
    ],
    draft: 'You can save a draft and come back anytime.',
    safety: "Sign in with your Pro account to continue. Never send documents by email, and don't upload government photo IDs.",
  },
  es: {
    welcomeHeading: (n?: string) => (n ? `Te damos la bienvenida a GetPros, ${n}` : 'Te damos la bienvenida a GetPros'),
    reminderHeading: (n?: string) => (n ? `${n}, tu perfil de GetPros está casi listo` : 'Tu perfil de GetPros está casi listo'),
    welcomeIntro: 'Tu cuenta Pro está lista. Termina tu registro y envía tu perfil para revisión.',
    reminderIntro: 'Un recordatorio amistoso: tu perfil aún no se ha enviado para revisión.',
    status: 'Estado: registro aún no enviado',
    stepsTitle: 'Tus próximos pasos',
    steps: [
      'Agrega tus servicios, ciudad, código postal, distancia que cubres y los datos de tu negocio.',
      'No necesitas subir credenciales para la revisión de tu perfil básico. Si quieres, puedes subir el registro de tu negocio, tu seguro de responsabilidad civil o tu licencia de oficio de forma privada. Los requisitos de licencia y seguro de cada servicio siguen vigentes antes de realizar ese trabajo.',
      'Envía tu perfil. Nuestro equipo lo revisará. No podrás aparecer en el sitio ni recibir reservas hasta que GetPros te apruebe.',
      'Después de la aprobación, configura tus pagos antes de aceptar trabajos pagados.',
    ],
    draft: 'Puedes guardar un borrador y volver cuando quieras.',
    safety: 'Inicia sesión con tu cuenta Pro para continuar. Nunca envíes documentos por correo electrónico ni subas identificaciones oficiales con foto.',
  },
}

function Steps({ lang }: { lang: 'en' | 'es' }) {
  const t = copy[lang]
  return (
    <Section lang={lang} style={{ margin: '0 0 8px' }}>
      <Text style={stepsTitle}>{t.stepsTitle}</Text>
      {t.steps.map((step, i) => (
        <Row key={i} style={{ marginBottom: '10px' }}>
          <Column style={{ width: '34px', verticalAlign: 'top' }}>
            <span style={stepNumber}>{i + 1}</span>
          </Column>
          <Column style={{ verticalAlign: 'top' }}>
            <Text style={stepText}>{step}</Text>
          </Column>
        </Row>
      ))}
      <Text style={{ ...emailStyles.paragraph, margin: '4px 0 0', fontSize: '14px' }}>{t.draft}</Text>
    </Section>
  )
}

const Email = ({ name, siteUrl = SITE_URL, variant = 'welcome' }: Props) => {
  const reminder = variant === 'reminder'
  const setupUrl = `${siteUrl}/provider-setup`
  const img = (path: string) => (/^https:\/\//.test(path) ? path : `${SITE_URL}${path}`)
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>
        {reminder
          ? 'Finish your GetPros Pro profile · Termina tu perfil Pro en GetPros'
          : 'Your GetPros Pro account is ready · Tu cuenta Pro de GetPros está lista'}
      </Preview>
      <Body style={emailStyles.main}>
        <Container style={emailStyles.container}>
          <EmailHeader siteUrl={siteUrl} />

          <Section style={hero}>
            <Text style={pill}>{reminder ? 'REMINDER · RECORDATORIO' : 'PRO ACCOUNT · CUENTA PRO'}</Text>
            <Heading as="h1" style={heroHeading}>
              {reminder ? copy.en.reminderHeading(name) : copy.en.welcomeHeading(name)}
            </Heading>
            <Text lang="es" style={heroHeadingEs}>
              {reminder ? copy.es.reminderHeading(name) : copy.es.welcomeHeading(name)}
            </Text>
          </Section>

          <Section style={{ margin: '0 0 6px' }}>
            {[0, 2].map((start) => (
              <Row key={start}>
                {PHOTOS.slice(start, start + 2).map((p) => (
                  <Column key={p.en} style={{ width: '50%', padding: '6px', verticalAlign: 'top' }}>
                    <Img
                      src={img(p.src)}
                      alt={`${p.en} professional at work / ${p.es}`}
                      width="254"
                      height="190"
                      style={photo}
                    />
                    <Text style={caption}>
                      {p.en} · <span lang="es">{p.es}</span>
                    </Text>
                  </Column>
                ))}
              </Row>
            ))}
          </Section>

          <Section style={statusBox}>
            <Text style={statusText}>{copy.en.status}</Text>
            <Text lang="es" style={{ ...statusText, fontWeight: 600 }}>{copy.es.status}</Text>
          </Section>

          <Text style={{ ...emailStyles.paragraph, margin: '18px 0 14px' }}>
            {reminder ? copy.en.reminderIntro : copy.en.welcomeIntro}
          </Text>
          <Steps lang="en" />

          <Section style={{ textAlign: 'center', margin: '22px 0 24px' }}>
            <Button style={cta} href={setupUrl}>
              Complete Your Setup · Completa tu registro →
            </Button>
          </Section>

          <Section lang="es" style={esBlock}>
            <Text style={langLabel}>ESPAÑOL</Text>
            <Text style={{ ...emailStyles.paragraph, margin: '0 0 14px' }}>
              {reminder ? copy.es.reminderIntro : copy.es.welcomeIntro}
            </Text>
            <Steps lang="es" />
          </Section>

          <Section style={safetyBox}>
            <Text style={safetyText}>{copy.en.safety}</Text>
            <Text lang="es" style={{ ...safetyText, marginTop: '8px' }}>{copy.es.safety}</Text>
          </Section>

          <EmailVideoSlot />
          <Text lang="es" style={{ ...emailStyles.small, marginTop: '24px' }}>
            ¿Necesitas ayuda? Responde a este correo o escribe a {SUPPORT_EMAIL}.
          </Text>
          <EmailFooter
            siteUrl={siteUrl}
            reason="You're receiving this because you created a provider account on GetPros.ai. · Recibes este correo porque creaste una cuenta de profesional en GetPros.ai."
          />
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    d['variant'] === 'reminder'
      ? 'Reminder: finish your GetPros provider profile · Termina tu perfil en GetPros'
      : 'Complete your GetPros provider profile · Completa tu perfil en GetPros',
  displayName: 'Provider profile reminder',
  previewData: { name: 'Alex', siteUrl: SITE_URL },
} satisfies TemplateEntry

const hero = {
  backgroundColor: BRAND_COLORS.navy,
  backgroundImage: `linear-gradient(135deg, ${BRAND_COLORS.navy} 0%, #164a6e 60%, #0b7f8a 100%)`,
  borderRadius: '16px',
  padding: '24px 22px 22px',
  margin: '20px 0 10px',
} as const
const pill = {
  display: 'inline-block',
  margin: '0 0 12px',
  padding: '4px 10px',
  borderRadius: '999px',
  backgroundColor: BRAND_COLORS.teal,
  color: '#ffffff',
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.08em',
} as const
const heroHeading = { margin: '0 0 6px', color: '#ffffff', fontSize: '24px', lineHeight: '1.25', fontWeight: 800 } as const
const heroHeadingEs = { margin: 0, color: '#cdeff2', fontSize: '17px', lineHeight: '1.35', fontWeight: 600 } as const
const photo = {
  display: 'block',
  width: '100%',
  maxWidth: '254px',
  height: 'auto',
  borderRadius: '12px',
  border: `1px solid ${BRAND_COLORS.line}`,
} as const
const caption = { margin: '6px 0 0', fontSize: '12px', lineHeight: '1.4', color: BRAND_COLORS.navy, fontWeight: 700 } as const
const statusBox = {
  backgroundColor: BRAND_COLORS.surface,
  border: `1px solid #bfe6ea`,
  borderLeft: `4px solid ${BRAND_COLORS.teal}`,
  borderRadius: '10px',
  padding: '10px 14px',
  margin: '12px 0 0',
} as const
const statusText = { margin: 0, fontSize: '14px', lineHeight: '1.5', color: BRAND_COLORS.navy, fontWeight: 700 } as const
const stepsTitle = { margin: '0 0 10px', fontSize: '16px', fontWeight: 800, color: BRAND_COLORS.navy } as const
const stepNumber = {
  display: 'inline-block',
  width: '24px',
  height: '24px',
  lineHeight: '24px',
  borderRadius: '999px',
  backgroundColor: BRAND_COLORS.teal,
  color: '#ffffff',
  fontSize: '13px',
  fontWeight: 700,
  textAlign: 'center',
} as const
const stepText = { margin: 0, fontSize: '15px', lineHeight: '1.55', color: BRAND_COLORS.body } as const
const cta = {
  display: 'inline-block',
  backgroundColor: BRAND_COLORS.navy,
  backgroundImage: `linear-gradient(120deg, ${BRAND_COLORS.navy} 0%, #0b7f8a 100%)`,
  color: '#ffffff',
  textDecoration: 'none',
  padding: '14px 24px',
  borderRadius: '999px',
  fontWeight: 700,
  fontSize: '15px',
} as const
const esBlock = {
  borderTop: `1px solid ${BRAND_COLORS.line}`,
  paddingTop: '18px',
  margin: '0 0 8px',
} as const
const langLabel = { margin: '0 0 8px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', color: BRAND_COLORS.teal } as const
const safetyBox = {
  backgroundColor: '#f8fafc',
  border: `1px solid ${BRAND_COLORS.line}`,
  borderRadius: '10px',
  padding: '12px 14px',
  margin: '18px 0 0',
} as const
const safetyText = { margin: 0, fontSize: '13px', lineHeight: '1.55', color: BRAND_COLORS.body } as const
