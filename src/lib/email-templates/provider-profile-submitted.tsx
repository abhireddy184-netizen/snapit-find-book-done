import React from 'react'
import { Body, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { EmailFooter, EmailHeader, SITE_URL, emailStyles } from './brand'

interface Props {
  businessName?: string
  siteUrl?: string
}

const Email = ({ businessName, siteUrl = SITE_URL }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>We've received your GetPros provider profile and it's pending review.</Preview>
    <Body style={emailStyles.main}>
      <Container style={emailStyles.container}>
        <EmailHeader siteUrl={siteUrl} />
        <Heading style={emailStyles.heading}>Your provider profile is pending review</Heading>
        <Text style={emailStyles.paragraph}>Hi {businessName?.trim() || 'there'},</Text>
        <Text style={emailStyles.paragraph}>
          Thank you for submitting your provider profile on GetPros. We&apos;ve received your business
          details and our team is reviewing them.
        </Text>
        <Text style={emailStyles.paragraph}>
          Your profile is pending verification and approval. We&apos;ll email you as soon as there&apos;s
          an update. If we need anything else, we&apos;ll reach out.
        </Text>
        <Text style={emailStyles.paragraph}>Thank you for joining GetPros.</Text>
        <Text style={emailStyles.paragraph}>The GetPros Team</Text>
        <EmailFooter
          siteUrl={siteUrl}
          reason="You're receiving this because you submitted a provider business profile on GetPros.ai."
        />
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: "We've received your GetPros provider profile",
  displayName: 'Provider profile submitted (pending review)',
  previewData: { businessName: 'KYNGSTON SERVICES', siteUrl: SITE_URL },
} satisfies TemplateEntry
