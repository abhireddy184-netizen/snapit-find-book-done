import React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { EmailFooter, EmailHeader, EmailVideoSlot, SITE_URL, SUPPORT_EMAIL, brand, emailStyles } from './brand'

interface Props {
  businessName?: string
  siteUrl?: string
  variant?: 'request' | 'reminder'
}

const step = { ...emailStyles.paragraph, margin: '0 0 6px' }
const box = {
  backgroundColor: brand.surface,
  border: `1px solid ${brand.line}`,
  borderRadius: '14px',
  padding: '16px 18px',
  margin: '18px 0',
}
const note = {
  borderLeft: `3px solid ${brand.primary}`,
  padding: '4px 0 4px 14px',
  margin: '18px 0',
}

const Email = ({ businessName, siteUrl = SITE_URL, variant = 'request' }: Props) => {
  const link = `${siteUrl}/provider-dashboard?tab=documents`
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Please securely upload a few documents in your GetPros provider dashboard.</Preview>
      <Body style={emailStyles.main}>
        <Container style={emailStyles.container}>
          <EmailHeader siteUrl={siteUrl} />
          <Heading style={emailStyles.heading}>{variant === 'reminder' ? 'Reminder: documents for your provider profile review' : 'Documents for your provider profile review'}</Heading>
          <Text style={emailStyles.paragraph}>Hi {businessName?.trim() || 'there'},</Text>
          <Text style={emailStyles.paragraph}>
            Thank you for submitting your GetPros provider profile. To continue our review, please
            upload the documents below that apply to your business:
          </Text>
          <Section style={box}>
            <Text style={step}>• Business registration</Text>
            <Text style={step}>• Liability insurance certificate</Text>
            <Text style={{ ...step, margin: 0 }}>
              • Any trade license that applies to the work you offer (for example, electrical work)
            </Text>
          </Section>
          <Text style={{ ...emailStyles.paragraph, fontWeight: 700, color: brand.ink, margin: '0 0 6px' }}>How to upload</Text>
          <Text style={step}>1. Sign in with your GetPros provider account.</Text>
          <Text style={step}>2. Open Dashboard → Documents.</Text>
          <Text style={step}>3. Select the document type.</Text>
          <Text style={{ ...step, margin: '0 0 14px' }}>4. Upload a PDF, JPG, PNG or WebP file (up to 10 MB).</Text>
          <Button style={emailStyles.button} href={link}>
            Securely Upload Documents
          </Button>
          <EmailVideoSlot />
          <Section style={note}>
            <Text style={{ ...emailStyles.paragraph, margin: 0 }}>
              <strong>For your security:</strong> please do not reply to this email with documents, and do
              not upload government photo IDs. Files you upload are private to you and the GetPros team and
              never appear on your public profile.
            </Text>
          </Section>
          <Text style={emailStyles.paragraph}>
            Our team reviews every document and will contact you once the review is complete. Questions?
            Reach us at {SUPPORT_EMAIL}.
          </Text>
          <Text style={emailStyles.paragraph}>Thank you,<br />The GetPros Team</Text>
          <EmailFooter
            siteUrl={siteUrl}
            reason="You're receiving this because you submitted a provider profile on GetPros.ai and our team requested documents for its review."
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
      ? 'Reminder: Upload Documents for Your GetPros Provider Profile'
      : 'Action Needed: Upload Documents for Your GetPros Provider Profile',
  displayName: 'Provider documents request',
  previewData: { businessName: 'KYNGSTON SERVICES', siteUrl: SITE_URL },
} satisfies TemplateEntry
