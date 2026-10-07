import Stripe from "stripe";

let client: Stripe | null = null;

/** Test-mode Stripe client. Refuses to run with a live key. */
export function getStripe(): Stripe {
  if (client) return client;
  const key = process.env["STRIPE_SECRET_KEY"];
  if (!key) throw new Error("Payments are not configured yet.");
  if (!key.startsWith("sk_test_")) throw new Error("Only Stripe test mode is enabled for GetPros.");
  client = new Stripe(key, { httpClient: Stripe.createFetchHttpClient() });
  return client;
}

export function siteOrigin(request?: Request | null): string {
  try {
    if (request) return new URL(request.url).origin;
  } catch {
    /* ignore */
  }
  return "https://getpros.ai";
}
