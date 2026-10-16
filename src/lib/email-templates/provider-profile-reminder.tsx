import React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { EmailFooter, EmailHeader, EmailVideoSlot, SITE_URL, emailStyles } from './brand'

interface Props {
  name?: string
  siteUrl?: string
  variant?: 'welcome' | 'reminder'
}

const Email = ({ name, siteUrl = SITE_URL, variant = 'welcome' }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Finish your GetPros provider profile to start getting jobs.</Preview>
    <Body style={emailStyles.main}>
      <Container style={emailStyles.container}>
        <EmailHeader siteUrl={siteUrl} />
        <Heading style={emailStyles.heading}>
          {variant === 'reminder'
            ? name ? `${name}, your GetPros profile is almost done` : 'Your GetPros profile is almost done'
            : name ? `Welcome to GetPros, ${name}` : 'Welcome to GetPros'}
        </Heading>
        <Text style={emailStyles.paragraph}>
          {variant === 'reminder'
            ? 'Just a friendly reminder: your provider account is set up, but your business profile still needs a few details before customers can find you.'
            : "Thanks for confirming your email. Your provider account is ready, but your business profile isn't finished yet."}
        </Text>
        <Text style={emailStyles.paragraph}>
          Add your services, service area, availability and payout details so customers can find
          and book you.
        </Text>
        <Button style={emailStyles.button} href={`${siteUrl}/provider-dashboard?tab=profile`}>
          Complete your profile
        </Button>
        <EmailVideoSlot />
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
  subject: (d: Record<string, any>) =>
    d['variant'] === 'reminder' ? 'Reminder: finish your GetPros provider profile' : 'Complete your GetPros provider profile',
  displayName: 'Provider profile reminder',
  previewData: { name: 'Alex', siteUrl: SITE_URL },
} satisfies TemplateEntry
