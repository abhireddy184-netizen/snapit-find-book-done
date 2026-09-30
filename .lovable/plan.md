# Read-only audit: forms, data, emails (no changes made)

## 1. FORMS
| Form | Page |
|---|---|
| Sign up (Customer / Service Provider) + Google/Apple | /register |
| Log in + Google/Apple | /login |
| Forgot / reset password | /reset-password |
| Join as a Pro (4-step interest form) | /provider-interest |
| Newsletter email signup | Home page footer (/) |
| Customer early access (shown when an area has no pros) | /search, /snap result, home |
| Service request / booking | /book |
| Pro business profile setup | /provider-dashboard (signed in) |
| Show GP (photo/voice/text) request box | / and /snap - not saved as a lead; it starts AI matching |
| Search box | /search - navigation only, saves nothing |

## 2. DATA
All data goes to this project's own Lovable Cloud database. No third-party form services.
- Sign up / log in: built-in accounts + `profiles` table
- Join as a Pro: `provider_interest`
- Newsletter: `subscribers`
- Early access: `early_access`
- Booking: `bookings` and `service_requests`
- Pro profile: `provider_profiles`, `provider_services`, `provider_availability`, `provider_time_off`

All tables used: profiles, provider_interest, subscribers, early_access, bookings, service_requests, provider_quotes, job_documents, provider_profiles, provider_services, provider_availability, provider_time_off (plus role table used by admin checks).

## 3. USER EMAILS
Service: Lovable's built-in email sending. Not Resend; Resend isn't used anywhere.
From address: `GetPros <noreply@notify.getperfectboy.com>`
- Newsletter: "welcome" email sent to a new or returning subscriber
- Join as a Pro: "provider-interest" confirmation sent to the pro
- Sign up: account confirmation email, and password reset email from /reset-password. These are the standard built-in account emails. There's no custom template in the project for them.
- Early access: no email to the user
- Booking: no email to the customer or the pro
- Pro profile setup: no email

## 4. OWNER NOTIFICATIONS
Sent to exactly one address: **reddy.abhinav10@gmail.com**. Reply-To is the lead's own email.
- Join as a Pro: yes, for new leads only (repeats are skipped)
- Newsletter: yes, for new and returning subscribers
- Early access: yes, the first time an email signs up for a given service
- Sign up (new accounts): **no**
- Bookings / service requests: **no**
- Pro profile setup: **no**

## 5. LIVE DOMAIN
**Yes.** This project is connected to getpros.ai, www.getpros.ai and www.getperfectboy.com.

No code was changed. Approving this only acknowledges the report.
