import React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'
import { EmailFooter, EmailHeader, SITE_URL, brand, emailStyles } from './brand'

interface Props {
  fullName?: string
  categoryLabel?: string
  city?: string
  state?: string
  siteUrl?: string
}

const Email = ({
  fullName = 'there',
  categoryLabel = 'your trade',
  city,
  state,
  siteUrl = SITE_URL,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>We&apos;ve received your GetPros provider interest registration.</Preview>
    <Body style={emailStyles.main}>
      <Container style={emailStyles.container}>
        <EmailHeader siteUrl={siteUrl} />
        <Heading style={emailStyles.heading}>Thanks, {fullName} — we&apos;ve got your details.</Heading>
        <Text style={emailStyles.paragraph}>
          You registered your interest in joining GetPros as a professional for{' '}
          <strong>{categoryLabel}</strong>
          {city ? ` around ${city}${state ? `, ${state}` : ''}` : ''}.
        </Text>

        <Section style={notice}>
          <Text style={noticeTitle}>This is not approval or verification yet</Text>
          <Text style={noticeBody}>
            Registering interest simply tells us where to open next. It does not create an
            account, and it does not make you a verified GetPros pro. Verification happens after
            a manual review of a completed business profile.
          </Text>
        </Section>

        <Text style={emailStyles.paragraph}>
          <strong>Your next step:</strong> create your free provider account with this same
          email address. We&apos;ll carry the details you just gave us straight into your
          business profile so you don&apos;t have to type them twice.
        </Text>

        <Button style={emailStyles.button} href={`${siteUrl}/register?role=provider`}>
          Create your provider account
        </Button>

        <Text style={steps}>
          1. Register interest ✓ &nbsp;→&nbsp; 2. Create your provider account &nbsp;→&nbsp;
          3. Complete your business profile &nbsp;→&nbsp; 4. GetPros review
        </Text>

        <EmailFooter
          siteUrl={siteUrl}
          reason="You're receiving this because you registered provider interest on GetPros.ai."
        />
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'We received your GetPros provider interest',
  displayName: 'Provider interest confirmation',
  previewData: {
    fullName: 'Jamie',
    categoryLabel: 'Plumbing',
    city: 'Frisco',
    state: 'TX',
    siteUrl: SITE_URL,
  },
} satisfies TemplateEntry

const notice = {
  backgroundColor: brand.surface,
  border: '1px solid #f6d6e7',
  borderRadius: '14px',
  padding: '14px 16px',
  margin: '18px 0',
}
const noticeTitle = { fontSize: '13px', fontWeight: 700 as const, color: '#b0155f', margin: '0 0 6px' }
const noticeBody = { fontSize: '13px', lineHeight: '1.6', color: brand.body, margin: 0 }
const steps = { fontSize: '12px', color: brand.muted, marginTop: '20px', lineHeight: '1.8' }
