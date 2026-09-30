import * as React from 'react'
import { Text } from '@react-email/components'
import { BRAND_COLORS } from '@/lib/brand'
import { AuthLayout, P } from './auth-layout'

interface ReauthenticationEmailProps { token: string }

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <AuthLayout
    preview="Your GetPros.ai verification code"
    title="Confirm it's you"
    note="This code expires shortly. If you didn't request it, you can ignore this email."
  >
    <P>Use this code to confirm your identity:</P>
    <Text style={{ fontFamily: 'Courier, monospace', fontSize: '26px', fontWeight: 700, letterSpacing: '4px', color: BRAND_COLORS.navy, margin: '8px 0' }}>
      {token}
    </Text>
  </AuthLayout>
)
export default ReauthenticationEmail
