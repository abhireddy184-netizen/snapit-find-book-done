import React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { EmailFooter, EmailHeader, SITE_URL, emailStyles } from './brand'

interface Props {
  name?: string
  siteUrl?: string
}

const Email = ({ name, siteUrl = SITE_URL }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Finish your GetPros provider profile to start getting jobs.</Preview>
    <Body style={emailStyles.main}>
      <Container style={emailStyles.container}>
        <EmailHeader siteUrl={siteUrl} />
        <Heading style={emailStyles.heading}>
          {name ? `Welcome to GetPros, ${name}` : 'Welcome to GetPros'}
        </Heading>
        <Text style={emailStyles.paragraph}>
          Thanks for confirming your email. Your provider account is ready, but your business
          profile isn&apos;t finished yet.
        </Text>
        <Text style={emailStyles.paragraph}>
          Add your services, service area, availability and payout details so customers can find
          and book you.
        </Text>
        <Button style={emailStyles.button} href={`${siteUrl}/provider-dashboard`}>
          Complete your profile
        </Button>
        <EmailFooter
          siteUrl={siteUrl}
          reason="You're receiving this because you created a provider account on GetPros.ai."
        />
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Complete your GetPros provider profile',
  displayName: 'Provider profile reminder',
  previewData: { name: 'Alex', siteUrl: SITE_URL },
} satisfies TemplateEntry
