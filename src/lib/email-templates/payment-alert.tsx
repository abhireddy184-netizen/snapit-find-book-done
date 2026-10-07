import React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { EmailFooter, EmailHeader, SITE_URL, emailStyles } from './brand'

interface Props {
  service?: string
  when?: string
  siteUrl?: string
}

const Email = ({ service = 'your job', when, siteUrl = SITE_URL }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>The customer&apos;s card hold didn&apos;t go through</Preview>
    <Body style={emailStyles.main}>
      <Container style={emailStyles.container}>
        <EmailHeader siteUrl={siteUrl} />
        <Heading style={emailStyles.heading}>Card hold didn&apos;t go through</Heading>
        <Text style={emailStyles.paragraph}>
          We couldn&apos;t place the card hold for {service}{when ? ` on ${when}` : ''}. We&apos;ve asked the
          customer to update their card and will retry automatically once they do.
        </Text>
        <Button style={emailStyles.button} href={`${siteUrl}/provider-dashboard`}>
          Open your dashboard
        </Button>
        <EmailFooter siteUrl={siteUrl} reason="You're receiving this because you're the pro on this GetPros booking." />
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'GetPros: a card hold for your job failed',
  displayName: 'Pro payment alert',
  previewData: { service: 'Faucet repair', when: 'Oct 10, 10:00 AM', siteUrl: SITE_URL },
} satisfies TemplateEntry
