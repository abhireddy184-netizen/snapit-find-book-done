import * as React from 'react'
import { AuthLayout, P } from './auth-layout'

interface SignupEmailProps { siteName: string; siteUrl: string; recipient: string; confirmationUrl: string }

export const SignupEmail = ({ recipient, confirmationUrl }: SignupEmailProps) => (
  <AuthLayout
    preview="Confirm your email for GetPros.ai"
    title="Confirm your email"
    cta={{ href: confirmationUrl, label: 'Verify email' }}
    note="If you didn't create a GetPros.ai account, you can safely ignore this email."
  >
    <P>Thanks for signing up for GetPros.ai!</P>
    <P>Please confirm your email address ({recipient}) by tapping the button below.</P>
  </AuthLayout>
)
export default SignupEmail
