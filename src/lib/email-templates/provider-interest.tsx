import React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  fullName?: string
  categoryLabel?: string
  city?: string
  state?: string
  siteUrl?: string
}

const SITE_URL = 'https://getperfectboy.com'

const Email = ({
  fullName = 'there',
  categoryLabel = 'your trade',
  city,
  state,
  siteUrl = SITE_URL,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>We&apos;ve received your GPB provider interest registration.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={monogram}>GPB</Text>
        <Text style={brand}>GetPerfectBoy.com</Text>
        <Heading style={heading}>Thanks, {fullName} — we&apos;ve got your details.</Heading>
        <Text style={paragraph}>
          You registered your interest in joining GPB as a professional for{' '}
          <strong>{categoryLabel}</strong>
          {city ? ` around ${city}${state ? `, ${state}` : ''}` : ''}.
        </Text>

        <Section style={notice}>
          <Text style={noticeTitle}>This is not approval or verification yet</Text>
          <Text style={noticeBody}>
            Registering interest simply tells us where to open next. It does not create an
            account, and it does not make you a verified GPB pro. Verification happens after
            a manual review of a completed business profile.
          </Text>
        </Section>

        <Text style={paragraph}>
          <strong>Your next step:</strong> create your free provider account with this same
          email address. We&apos;ll carry the details you just gave us straight into your
          business profile so you don&apos;t have to type them twice.
        </Text>

        <Button style={button} href={`${siteUrl}/register?role=provider`}>
          Create your provider account
        </Button>

        <Text style={steps}>
          1. Register interest ✓ &nbsp;→&nbsp; 2. Create your provider account &nbsp;→&nbsp;
          3. Complete your business profile &nbsp;→&nbsp; 4. GPB review
        </Text>

        <Hr style={hr} />
        <Text style={footer}>GPB / GetPerfectBoy.com</Text>
        <Text style={footer}>
          You&apos;re receiving this because you registered provider interest on
          GetPerfectBoy.com.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'We received your GPB provider interest',
  displayName: 'Provider interest confirmation',
  previewData: {
    fullName: 'Jamie',
    categoryLabel: 'Plumbing',
    city: 'Frisco',
    state: 'TX',
    siteUrl: SITE_URL,
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif', color: '#2b1030' }
const container = { maxWidth: '520px', margin: '0 auto', padding: '32px 24px' }
const monogram = { fontSize: '28px', fontWeight: 800 as const, letterSpacing: '-0.02em', margin: '0' }
const brand = { fontSize: '13px', fontWeight: 700 as const, color: '#6b5b6e', margin: '2px 0 0' }
const heading = { fontSize: '22px', margin: '24px 0 8px', color: '#2b1030' }
const paragraph = { fontSize: '15px', lineHeight: '1.6', color: '#4a3550' }
const notice = {
  backgroundColor: '#fdf3f8',
  border: '1px solid #f6d6e7',
  borderRadius: '14px',
  padding: '14px 16px',
  margin: '18px 0',
}
const noticeTitle = { fontSize: '13px', fontWeight: 700 as const, color: '#b0155f', margin: '0 0 6px' }
const noticeBody = { fontSize: '13px', lineHeight: '1.6', color: '#4a3550', margin: 0 }
const button = {
  display: 'inline-block',
  backgroundColor: '#e6187f',
  color: '#ffffff',
  textDecoration: 'none',
  padding: '12px 22px',
  borderRadius: '999px',
  fontWeight: 700 as const,
  fontSize: '14px',
  marginTop: '12px',
}
const steps = { fontSize: '12px', color: '#8a7c8e', marginTop: '20px', lineHeight: '1.8' }
const hr = { border: 'none', borderTop: '1px solid #ece5ef', margin: '32px 0 16px' }
const footer = { fontSize: '12px', color: '#8a7c8e' }
