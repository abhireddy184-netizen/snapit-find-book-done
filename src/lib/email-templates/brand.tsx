import React from 'react'
import { Column, Hr, Img, Link, Row, Section, Text } from '@react-email/components'

/**
 * Shared GetPros email branding: header mark + standardized footer.
 * Every registered template should use <EmailHeader /> and <EmailFooter />
 * so all GetPros-controlled emails share one visual identity.
 */

export const SITE_URL = 'https://getperfectboy.com'
/** Absolute HTTPS URL — served from the site's /public folder, safe for Gmail / Apple Mail / Outlook. */
export const LOGO_URL = `${SITE_URL}/icon-512.png`
export const SUPPORT_EMAIL = 'support@getperfectboy.com'

export const brand = {
  ink: '#2b1030',
  body: '#4a3550',
  muted: '#8a7c8e',
  primary: '#db2298',
  secondary: '#3c5eeb',
  line: '#ece5ef',
  surface: '#fdf3f8',
}

export const emailStyles = {
  main: {
    backgroundColor: '#ffffff',
    fontFamily: 'Arial, Helvetica, sans-serif',
    color: brand.ink,
  } as const,
  container: { maxWidth: '560px', margin: '0 auto', padding: '28px 24px 36px' } as const,
  heading: { fontSize: '22px', lineHeight: '1.3', margin: '22px 0 8px', color: brand.ink } as const,
  paragraph: { fontSize: '15px', lineHeight: '1.6', color: brand.body } as const,
  button: {
    display: 'inline-block',
    backgroundColor: brand.primary,
    color: '#ffffff',
    textDecoration: 'none',
    padding: '12px 22px',
    borderRadius: '999px',
    fontWeight: 700 as const,
    fontSize: '14px',
    marginTop: '12px',
  } as const,
  hr: { border: 'none', borderTop: `1px solid ${brand.line}`, margin: '32px 0 16px' } as const,
  small: { fontSize: '12px', lineHeight: '1.7', color: brand.muted, margin: '0 0 6px' } as const,
}

export function EmailHeader({ siteUrl = SITE_URL }: { siteUrl?: string }) {
  return (
    <Section style={{ paddingBottom: '4px' }}>
      <Row>
        <Column style={{ width: '48px', verticalAlign: 'middle' }}>
          <Link href={siteUrl}>
            <Img
              src={LOGO_URL}
              width="44"
              height="44"
              alt="GetPros — GetPros.ai"
              style={{ display: 'block', borderRadius: '12px', border: '0', outline: 'none' }}
            />
          </Link>
        </Column>
        <Column style={{ verticalAlign: 'middle', paddingLeft: '12px' }}>
          <Text
            style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: 800 as const,
              letterSpacing: '-0.01em',
              color: brand.ink,
            }}
          >
            GetPros.ai
          </Text>
          <Text style={{ margin: '2px 0 0', fontSize: '12px', color: brand.muted }}>
            Show it. We&apos;ll handle the rest.
          </Text>
        </Column>
      </Row>
    </Section>
  )
}

export function EmailFooter({
  siteUrl = SITE_URL,
  /** Marketing/subscriber emails explain unsubscribe; transactional emails do not. */
  marketing = false,
  reason,
}: {
  siteUrl?: string
  marketing?: boolean
  reason?: string
}) {
  return (
    <>
      <Hr style={emailStyles.hr} />
      <Text style={emailStyles.small}>
        <Link href={siteUrl} style={{ color: brand.secondary, textDecoration: 'none', fontWeight: 700 }}>
          GetPros.ai
        </Link>{' '}
        — AI-powered home &amp; personal services marketplace.
      </Text>
      <Text style={emailStyles.small}>
        Need a hand? Reply to this email or write to{' '}
        <Link href={`mailto:${SUPPORT_EMAIL}`} style={{ color: brand.secondary }}>
          {SUPPORT_EMAIL}
        </Link>
        .
      </Text>
      {reason ? <Text style={emailStyles.small}>{reason}</Text> : null}
      {marketing ? (
        <Text style={emailStyles.small}>
          Don&apos;t want these updates? Use the unsubscribe link below to opt out at any time.
        </Text>
      ) : null}
    </>
  )
}
