import * as React from 'react'
import { AuthLayout, P } from './auth-layout'

interface EmailChangeEmailProps {
  siteName: string
  // oldEmail is the current address; for the NEW-recipient half, `email` equals NEW.
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({ oldEmail, newEmail, confirmationUrl }: EmailChangeEmailProps) => (
  <AuthLayout
    preview="Confirm your GetPros.ai email change"
    title="Confirm your email change"
    cta={{ href: confirmationUrl, label: 'Confirm email change' }}
    note="If you didn't request this change, please secure your account right away."
  >
    <P>You asked to change your GetPros.ai email from {oldEmail} to {newEmail}.</P>
  </AuthLayout>
)
export default EmailChangeEmail
