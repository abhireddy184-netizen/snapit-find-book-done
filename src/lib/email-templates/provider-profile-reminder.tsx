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
    <Preview>Complete your secure GetPros setup and submit your profile for review.</Preview>
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
            ? 'A friendly reminder to finish your saved GetPros setup. Your profile has not yet been submitted for review.'
            : 'Welcome to GetPros. Your secure provider setup is ready for you to continue.'}
        </Text>
        <Text style={emailStyles.paragraph}>
          Add your services, service area, business details and applicable private documents in one place.
          Save a draft and return whenever you are ready. GetPros admin approval is required before your profile can be listed or booked.
        </Text>
        <Button style={emailStyles.button} href={`${siteUrl}/provider-setup`}>
          Complete Your Setup
        </Button>
        <Text style={emailStyles.paragraph}>Sign in with your Pro account to resume. Never reply to emails with documents or upload government photo IDs. Payout setup comes after approval and must be configured before paid bookings.</Text>
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
