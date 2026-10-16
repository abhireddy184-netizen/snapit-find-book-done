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
    <Preview>Your GetPros provider profile has been approved by our team.</Preview>
    <Body style={emailStyles.main}>
      <Container style={emailStyles.container}>
        <EmailHeader siteUrl={siteUrl} />
        <Heading style={emailStyles.heading}>Your provider profile has been approved</Heading>
        <Text style={emailStyles.paragraph}>Hi {businessName?.trim() || 'there'},</Text>
        <Text style={emailStyles.paragraph}>
          Good news: the GetPros team has reviewed and approved your provider business profile.
        </Text>
        <Text style={emailStyles.paragraph}>
          You can now sign in to your provider dashboard to keep your services, service area and
          availability up to date, and finish payout setup if you haven&apos;t already.
        </Text>
        <Button style={emailStyles.button} href={`${siteUrl}/provider-dashboard`}>
          Go to your dashboard
        </Button>
        <Text style={emailStyles.paragraph}>Thank you for joining GetPros.</Text>
        <Text style={emailStyles.paragraph}>The GetPros Team</Text>
        <EmailFooter
          siteUrl={siteUrl}
          reason="You're receiving this because a GetPros admin approved your provider profile on GetPros.ai. This approval reflects our team's review of your profile details."
        />
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Your GetPros Provider Profile Has Been Approved',
  displayName: 'Provider profile approved',
  previewData: { businessName: 'KYNGSTON SERVICES', siteUrl: SITE_URL },
} satisfies TemplateEntry
