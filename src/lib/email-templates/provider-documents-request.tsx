import React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { EmailFooter, EmailHeader, SITE_URL, emailStyles } from './brand'

interface Props {
  businessName?: string
  siteUrl?: string
}

const Email = ({ businessName, siteUrl = SITE_URL }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Please upload a few documents in your GetPros provider dashboard.</Preview>
    <Body style={emailStyles.main}>
      <Container style={emailStyles.container}>
        <EmailHeader siteUrl={siteUrl} />
        <Heading style={emailStyles.heading}>A few documents for your profile review</Heading>
        <Text style={emailStyles.paragraph}>Hi {businessName?.trim() || 'there'},</Text>
        <Text style={emailStyles.paragraph}>
          Thank you for submitting your GetPros provider profile. To continue our review, please
          sign in and upload the documents that apply to your business in the Documents section of
          your provider dashboard:
        </Text>
        <Text style={emailStyles.paragraph}>
          • Business registration{'\n'}• Liability insurance certificate{'\n'}• Any trade license that
          applies to the work you offer (for example, electrical work)
        </Text>
        <Text style={emailStyles.paragraph}>
          For your privacy, please don&apos;t reply to this email with documents — upload them only
          through your signed-in dashboard.
        </Text>
        <Button style={emailStyles.button} href={`${siteUrl}/provider-dashboard?tab=documents`}>
          Upload documents
        </Button>
        <Text style={emailStyles.paragraph}>Thank you,</Text>
        <Text style={emailStyles.paragraph}>The GetPros Team</Text>
        <EmailFooter
          siteUrl={siteUrl}
          reason="You're receiving this because you submitted a provider profile on GetPros.ai and our team requested documents for its review."
        />
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Documents Needed for Your GetPros Provider Profile',
  displayName: 'Provider documents request',
  previewData: { businessName: 'KYNGSTON SERVICES', siteUrl: SITE_URL },
} satisfies TemplateEntry
