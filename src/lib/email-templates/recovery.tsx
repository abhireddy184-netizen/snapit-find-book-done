import * as React from 'react'
import { AuthLayout, P } from './auth-layout'

interface RecoveryEmailProps { siteName: string; confirmationUrl: string }

export const RecoveryEmail = ({ confirmationUrl }: RecoveryEmailProps) => (
  <AuthLayout
    preview="Reset your GetPros.ai password"
    title="Reset your password"
    cta={{ href: confirmationUrl, label: 'Reset password' }}
    note="If you didn't request a password reset, you can ignore this email. Your password won't change."
  >
    <P>We received a request to reset your GetPros.ai password. Tap the button below to choose a new one.</P>
  </AuthLayout>
)
export default RecoveryEmail
