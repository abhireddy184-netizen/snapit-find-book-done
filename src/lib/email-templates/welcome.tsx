import React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  siteUrl?: string
}

const SITE_URL = 'https://getperfectboy.com'

const Email = ({ siteUrl = SITE_URL }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Show it. We&apos;ll handle the rest.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={monogram}>GPB</Text>
        <Text style={brand}>GetPerfectBoy.com</Text>
        <Heading style={heading}>Show it. We&apos;ll handle the rest.</Heading>
        <Text style={paragraph}>
          Thanks for joining GPB. We&apos;ll keep you updated on launches, new services and
          important GPB updates.
        </Text>
        <Button style={button} href={siteUrl}>
          Explore GPB
        </Button>
        <Hr style={hr} />
        <Text style={footer}>
          You&apos;re receiving this because you subscribed on GetPerfectBoy.com.
        </Text>
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

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif', color: '#2b1030' }
const container = { maxWidth: '520px', margin: '0 auto', padding: '32px 24px' }
const monogram = { fontSize: '28px', fontWeight: 800 as const, letterSpacing: '-0.02em', margin: '0' }
const brand = { fontSize: '13px', fontWeight: 700 as const, color: '#6b5b6e', margin: '2px 0 0' }
const heading = { fontSize: '22px', margin: '24px 0 8px', color: '#2b1030' }
const paragraph = { fontSize: '15px', lineHeight: '1.6', color: '#4a3550' }
const button = {
  display: 'inline-block',
  backgroundColor: '#e6187f',
  color: '#ffffff',
  textDecoration: 'none',
  padding: '12px 22px',
  borderRadius: '999px',
  fontWeight: 700 as const,
  fontSize: '14px',
  marginTop: '20px',
}
const hr = { border: 'none', borderTop: '1px solid #ece5ef', margin: '32px 0 16px' }
const footer = { fontSize: '12px', color: '#8a7c8e' }