import React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { EmailFooter, EmailHeader, SITE_URL, SUPPORT_EMAIL, emailStyles } from './brand'

interface Props {
  businessName?: string
  siteUrl?: string
}

const Email = ({ businessName, siteUrl = SITE_URL }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>We've received your documents. The GetPros team will review them.</Preview>
    <Body style={emailStyles.main}>
      <Container style={emailStyles.container}>
        <EmailHeader siteUrl={siteUrl} />
        <Heading style={emailStyles.heading}>We've received your documents</Heading>
        <Text style={emailStyles.paragraph}>Hi {businessName?.trim() || 'there'},</Text>
        <Text style={emailStyles.paragraph}>
          Thank you for uploading your documents. A member of the GetPros team will review them along
          with your provider profile. Uploading documents does not approve your profile on its own — we'll
          email you once the review is complete, or if we need anything else.
        </Text>
        <Text style={emailStyles.paragraph}>
          You can check the status of each file, or add a trade license that applies to your work, in your
          dashboard at any time.
        </Text>
        <Button style={emailStyles.button} href={`${siteUrl}/provider-dashboard?tab=documents`}>
          View my documents
        </Button>
        <Text style={emailStyles.paragraph}>Questions? Reach us at {SUPPORT_EMAIL}.</Text>
        <Text style={emailStyles.paragraph}>Thank you,<br />The GetPros Team</Text>
        <EmailFooter
          siteUrl={siteUrl}
          reason="You're receiving this because you uploaded documents for your GetPros provider profile."
        />
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: "We've received your GetPros provider documents",
  displayName: 'Provider documents received',
  previewData: { businessName: 'KYNGSTON SERVICES', siteUrl: SITE_URL },
} satisfies TemplateEntry
