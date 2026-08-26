import React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { EmailFooter, EmailHeader, SITE_URL, emailStyles } from './brand'

interface Props {
  siteUrl?: string
}

const Email = ({ siteUrl = SITE_URL }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Show it. We&apos;ll handle the rest.</Preview>
    <Body style={emailStyles.main}>
      <Container style={emailStyles.container}>
        <EmailHeader siteUrl={siteUrl} />
        <Heading style={emailStyles.heading}>Show it. We&apos;ll handle the rest.</Heading>
        <Text style={emailStyles.paragraph}>
          Thanks for joining GPB. We&apos;ll keep you updated on launches, new services and
          important GPB updates.
        </Text>
        <Button style={emailStyles.button} href={siteUrl}>
          Explore GPB
        </Button>
        <EmailFooter
          siteUrl={siteUrl}
          marketing
          reason="You're receiving this because you subscribed on GetPerfectBoy.com."
        />
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Welcome to GPB 👋',
  displayName: 'Newsletter welcome',
  previewData: { siteUrl: SITE_URL },
} satisfies TemplateEntry
