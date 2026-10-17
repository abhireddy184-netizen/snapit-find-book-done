import React from 'react';
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from '@react-email/components';
import type { TemplateEntry } from './registry';
import { EmailFooter, EmailHeader, SITE_URL, SUPPORT_EMAIL, emailStyles } from './brand';

function Email({ businessName, siteUrl = SITE_URL }: { businessName?: string; siteUrl?: string }) {
  return <Html lang="en" dir="ltr"><Head /><Preview>Your profile and documentation have been received for GetPros review.</Preview><Body style={emailStyles.main}><Container style={emailStyles.container}>
    <EmailHeader siteUrl={siteUrl} />
    <Heading style={emailStyles.heading}>Your profile is under verification</Heading>
    <Text style={emailStyles.paragraph}>Hi {businessName?.trim() || 'there'},</Text>
    <Text style={emailStyles.paragraph}>Thank you for completing your GetPros profile and submitting your documentation. We have received your submission, and the GetPros team is reviewing it.</Text>
    <Text style={emailStyles.paragraph}>Your profile is not approved yet. We will contact you about the review or if we need further information. Submission does not confirm identity, licensing, background checks or approval.</Text>
    <Button style={emailStyles.button} href={`${siteUrl}/provider-dashboard`}>View My Dashboard</Button>
    <Text style={emailStyles.paragraph}>Questions? Contact {SUPPORT_EMAIL}. Please do not reply with documents; upload them securely in your account.</Text>
    <Text style={emailStyles.paragraph}>Thank you,<br />The GetPros Team</Text>
    <EmailFooter siteUrl={siteUrl} reason="You received this because you submitted your GetPros profile and required documents for review." />
  </Container></Body></Html>;
}

export const template = { component: Email, subject: 'Your GetPros Profile Is Under Verification', displayName: 'Complete Pro setup submitted', previewData: { businessName: 'Example Services', siteUrl: SITE_URL } } satisfies TemplateEntry;