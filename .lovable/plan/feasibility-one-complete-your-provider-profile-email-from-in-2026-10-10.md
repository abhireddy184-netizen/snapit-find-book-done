# Feasibility: one "complete your provider profile" email from info@getpros.ai

## Answer: not possible without changes

The project can't send this one email from info@getpros.ai unless something is changed first. Nothing was sent.

## Why
- **Sender address is fixed.** Every app email goes out as `GetPros <noreply@notify.getpros.ai>`. That address is built from the shared brand settings. Changing it to info@getpros.ai means a code change, and the email domain must have root-domain sending ("display from root") turned on and verified. That setting has not been confirmed.
- **No suitable message exists.** The four current templates are the newsletter welcome, the Join-as-a-Pro confirmation, the owner-only lead alert (always goes to info@getpros.ai) and the payment alert. None of them says "complete your provider profile". Using one of them would send the wrong message.
- **No way to send a one-off email.** Every send runs through app code. There's no manual "send this email" option that skips code.
- What works today without changes: replies to app emails already go to info@getpros.ai (Reply-To). The visible From, though, is noreply@notify.getpros.ai.

## Smallest path if approved (separate build step)
1. Check the email domain's status. Turn on root-domain From display only if it's supported and verified.
2. Add one transactional template, "provider-profile-reminder", using the GetPros wordmark, header and footer, with a button to /provider-dashboard.
3. Let that template use a From of `GetPros <info@getpros.ai>`. Other emails stay unchanged.
4. Send exactly once to the approved recipient, with a fixed idempotency key so a retry can't send a duplicate. Then confirm the result in the email logs.

Alternative with no root-domain change: send from noreply@notify.getpros.ai with Reply-To info@getpros.ai. This still needs step 2.
