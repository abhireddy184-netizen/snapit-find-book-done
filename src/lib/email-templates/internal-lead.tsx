import React from 'react'
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { EmailHeader, brand, emailStyles } from './brand'

export const INTERNAL_LEAD_RECIPIENT = 'reddy.abhinav10@gmail.com'

export type LeadType = 'provider' | 'subscriber' | 'early_access'

interface Props {
  leadType?: LeadType
  name?: string | null
  email?: string | null
  phone?: string | null
  businessName?: string | null
  service?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
  location?: string | null
  source?: string | null
  note?: string | null
  submittedAt?: string | null
  reactivated?: boolean
  yearsExperience?: number | null
  attribution?: Record<string, string | null | undefined> | null
}

const TYPE_LABEL: Record<LeadType, string> = {
  provider: 'Pro lead (Join as a Pro)',
  subscriber: 'Newsletter subscriber',
  early_access: 'Customer early access',
}

export function leadPlace(d: Props): string {
  const cs = [d.city, d.state].filter(Boolean).join(', ')
  return cs || d.zip || d.location || 'Unknown location'
}

const InternalLeadEmail = (props: Props) => {
  const type = props.leadType ?? 'subscriber'
  const rows: Array<[string, string | null | undefined]> = [
    ['Lead type', TYPE_LABEL[type] + (props.reactivated ? ' (reactivated)' : '')],
    ['Name', props.name],
    ['Email', props.email],
    ['Phone', props.phone],
    ['Business', props.businessName],
    ['Service / category', props.service],
    ['City / State', [props.city, props.state].filter(Boolean).join(', ') || null],
    ['ZIP', props.zip],
    ['Location entered', props.location],
    ['Years of experience', props.yearsExperience != null ? String(props.yearsExperience) : null],
    ['Source', props.source],
    ...Object.entries(props.attribution ?? {}).map(([k, v]) => [k, v] as [string, string | null | undefined]),
    ['Note', props.note],
    ['Submitted', props.submittedAt ? new Date(props.submittedAt).toUTCString() : null],
  ]
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>New GetPros lead: {props.email ?? 'unknown'}</Preview>
      <Body style={emailStyles.main}>
        <Container style={emailStyles.container}>
          <EmailHeader />
          <Heading style={emailStyles.heading}>New GetPros lead</Heading>
          <Text style={emailStyles.paragraph}>Internal notification — reply to this email to contact the lead directly.</Text>
          <Section style={{ border: `1px solid ${brand.line}`, borderRadius: '12px', padding: '8px 16px' }}>
            {rows
              .filter(([, v]) => v != null && String(v).trim() !== '')
              .map(([k, v]) => (
                <Text key={k} style={{ margin: '8px 0', fontSize: '14px', color: brand.body }}>
                  <strong style={{ color: brand.ink }}>{k}:</strong> {String(v)}
                </Text>
              ))}
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: InternalLeadEmail,
  to: INTERNAL_LEAD_RECIPIENT,
  displayName: 'Internal: new lead notification',
  subject: (d: Record<string, any>) => {
    const p = d as Props
    if (p.leadType === 'provider') return `New GetPros Pro lead — ${p.service ?? 'Unknown category'} — ${leadPlace(p)}`
    if (p.leadType === 'early_access') return `New GetPros early-access lead — ${p.service ?? 'Unknown service'} — ${leadPlace(p)}`
    return `New GetPros subscriber — ${p.email ?? 'unknown'}`
  },
  previewData: {
    leadType: 'provider',
    name: 'Jamie Rivera',
    email: 'jamie@example.com',
    phone: '(555) 010-2030',
    businessName: 'Rivera Plumbing',
    service: 'Plumbing',
    city: 'Katy',
    state: 'TX',
    zip: '77494',
    source: 'provider_interest',
    submittedAt: '2026-09-28T06:00:00Z',
  },
} satisfies TemplateEntry
