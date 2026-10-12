# Read-only Stripe security audit — findings (nothing changed)

## 1. Secret names (presence only, no values)
| Name | Status |
|---|---|
| STRIPE_SECRET_KEY | present |
| STRIPE_PUBLISHABLE_KEY | present |
| STRIPE_WEBHOOK_SECRET | present |
| STRIPE_CONNECT_WEBHOOK_SECRET | present |

One backend serves both the preview and the live site, so the live site uses the same saved values.

## 2. Test or live mode
- The code refuses to run unless the secret key starts with `sk_test_` and the publishable key starts with `pk_test_`. Live keys throw an error before any Stripe call is made.
- An earlier read-only check confirmed the secret key is `sk_test_`, belonging to sandbox "ABHIGROUP LLC sandbox", acct_1UO0ZNGt3tf30at1.
- Webhook signing secrets all start with `whsec_` whatever the mode, so their mode can't be told from the prefix.

## 3. The two webhook addresses
**/api/public/stripe/webhook** (your main account)
- Checks the signature against STRIPE_WEBHOOK_SECRET, then against STRIPE_CONNECT_WEBHOOK_SECRET.
- Handles: account.updated, setup_intent.succeeded, payment_intent.amount_capturable_updated / succeeded / payment_failed / canceled, charge.refunded. It only logs charge.dispute.created/closed and payout.paid/failed.

**/api/public/stripe/connect-webhook** (pros' connected accounts)
- Checks the signature against STRIPE_CONNECT_WEBHOOK_SECRET only.
- Handles: account.updated (status re-read from Stripe), plus the same payment_intent and charge.refunded events. Each payment is matched by payment ID and the pro's account ID. It only logs disputes.

**Common to both**
- Both reject a missing signature (400) or a bad one (400).
- Both skip repeat events, using the stripe_events table.
- Both use `constructEventAsync` on the raw body, so they only accept full **Snapshot** event payloads, the classic v1 `Stripe.Event`.
- Neither one parses **Thin** (v2) event notifications. Neither one has a v2 ping handler.

## 4. Why "invalid signature" could happen
- **Wrong destination secret (most likely):** STRIPE_CONNECT_WEBHOOK_SECRET was last saved from a destination in acct_1UOO2FK17anTLxiC. The app's key belongs to acct_1UO0ZNGt3tf30at1. No destination exists in the app's sandbox (0 v1 endpoints, 0 v2 destinations). So any event signed by the other sandbox's destination is rejected at connect-webhook. The main webhook would also reject it unless STRIPE_WEBHOOK_SECRET happens to match.
- **Several sandboxes:** confirmed. There are two sandbox account IDs that look alike. The secrets and destinations have to come from the same sandbox as STRIPE_SECRET_KEY.
- **Thin vs Snapshot:** if the destination uses the Thin payload, the signature can still pass, but the payload won't match what the code expects. Events may then be ignored, or the handler may fail. Thin payloads don't directly cause "invalid signature". Choose **Snapshot** for both destinations.
- **Main vs connected-account mix-up:** if a "Connected accounts" destination's secret is saved as STRIPE_WEBHOOK_SECRET (or the other way round), the main webhook still accepts it, because it tries both secrets. connect-webhook would reject it.

## 5. What can only be checked in the Stripe Dashboard
- Which sandbox each destination belongs to, and its payload style (Snapshot or Thin).
- Its event list and its delivery history or response codes.
- Whether the saved signing secrets match those destinations. I can't compare them without reading secret values.
- Whether the live site is running the newest code. No version marker is available.

## Smallest next step (for you, in Stripe)
1. In sandbox acct_1UO0ZNGt3tf30at1, create a Snapshot "Connected accounts" destination pointing at /api/public/stripe/connect-webhook.
2. Optionally, create a Snapshot "Your account" destination pointing at /api/public/stripe/webhook.
3. Save each signing secret under the matching name.
4. Send a test event and confirm Stripe records a 200.
