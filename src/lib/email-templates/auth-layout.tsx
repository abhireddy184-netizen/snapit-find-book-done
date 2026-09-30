import React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'
import { EmailFooter, EmailHeader, SITE_URL, emailStyles } from './brand'

/** Shared GetPros layout for every auth email: canonical wordmark header + footer. */
export function AuthLayout({
  preview, title, children, cta, note,
}: {
  preview: string
  title: string
  children: React.ReactNode
  cta?: { href: string; label: string }
  note?: string
}) {
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={emailStyles.main}>
        <Container style={emailStyles.container}>
          <EmailHeader siteUrl={SITE_URL} />
          <Heading style={emailStyles.heading}>{title}</Heading>
          {children}
          {cta ? (
            <Button style={emailStyles.button} href={cta.href}>
              {cta.label}
            </Button>
          ) : null}
          {note ? <Text style={{ ...emailStyles.small, marginTop: '24px' }}>{note}</Text> : null}
          <EmailFooter siteUrl={SITE_URL} />
        </Container>
      </Body>
    </Html>
  )
}

export const P = ({ children }: { children: React.ReactNode }) => (
  <Text style={emailStyles.paragraph}>{children}</Text>
)
