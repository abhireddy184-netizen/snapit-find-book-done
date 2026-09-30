import * as React from 'react'
import { AuthLayout, P } from './auth-layout'

interface InviteEmailProps { siteName: string; siteUrl: string; confirmationUrl: string }

export const InviteEmail = ({ confirmationUrl }: InviteEmailProps) => (
  <AuthLayout
    preview="You've been invited to join GetPros.ai"
    title="You've been invited"
    cta={{ href: confirmationUrl, label: 'Accept invitation' }}
    note="If you weren't expecting this invitation, you can safely ignore this email."
  >
    <P>You've been invited to join GetPros.ai. Tap the button below to accept and create your account.</P>
  </AuthLayout>
)
export default InviteEmail
