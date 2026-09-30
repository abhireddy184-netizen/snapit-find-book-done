import React from 'react'
import { Hr, Link, Section, Text } from '@react-email/components'
import { BRAND_COLORS, CONTACT_EMAIL, SITE_URL as BRAND_SITE_URL } from '@/lib/brand'

/**
 * Shared GetPros email branding: text wordmark header + standardized footer.
 * Values come from src/lib/brand.ts so emails never drift from the site.
 */

export const SITE_URL = BRAND_SITE_URL
export const SUPPORT_EMAIL = CONTACT_EMAIL

export const brand = {
  ink: BRAND_COLORS.ink,
  body: BRAND_COLORS.body,
  muted: BRAND_COLORS.muted,
  primary: BRAND_COLORS.teal,
  secondary: BRAND_COLORS.navy,
  line: BRAND_COLORS.line,
  surface: BRAND_COLORS.surface,
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
    backgroundColor: BRAND_COLORS.navy,
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

/** Text wordmark matching the site header: Get (navy) Pros (teal) .ai (slate). */
export function EmailWordmark({ siteUrl = SITE_URL, size = 24 }: { siteUrl?: string; size?: number }) {
  return (
    <Link href={siteUrl} style={{ textDecoration: 'none' }}>
      <span style={{ fontSize: `${size}px`, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1 }}>
        <span style={{ color: BRAND_COLORS.navy }}>Get</span>
        <span style={{ color: BRAND_COLORS.teal }}>Pros</span>
        <span style={{ color: BRAND_COLORS.slate, fontWeight: 700 }}>.ai</span>
      </span>
    </Link>
  )
}

export function EmailHeader({ siteUrl = SITE_URL }: { siteUrl?: string }) {
  return (
    <Section style={{ paddingBottom: '4px' }}>
      <EmailWordmark siteUrl={siteUrl} />
      <Text style={{ margin: '6px 0 0', fontSize: '12px', color: brand.muted }}>
        Show it. We&apos;ll handle the rest.
      </Text>
    </Section>
  )
}

export function EmailFooter({
  siteUrl = SITE_URL,
  /** Subscriber emails explain unsubscribe; transactional emails do not. */
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
