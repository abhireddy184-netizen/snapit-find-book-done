import * as React from 'react'
import { AuthLayout, P } from './auth-layout'

interface MagicLinkEmailProps { siteName: string; confirmationUrl: string }

export const MagicLinkEmail = ({ confirmationUrl }: MagicLinkEmailProps) => (
  <AuthLayout
    preview="Your GetPros.ai login link"
    title="Your login link"
    cta={{ href: confirmationUrl, label: 'Log in' }}
    note="If you didn't request this link, you can safely ignore this email."
  >
    <P>Tap the button below to log in to GetPros.ai. This link expires shortly.</P>
  </AuthLayout>
)
export default MagicLinkEmail
