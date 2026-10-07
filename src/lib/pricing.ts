/** Marketplace money rules. Used on the server to compute every charged amount. */
export const PLATFORM_FEE_PERCENT = 15; // taken from the pro's share
export const CUSTOMER_SERVICE_FEE_PERCENT = 5; // added to the customer's total
export const LATE_CANCEL_FEE_CENTS = 2500;

export function computeBookingAmounts(subtotalCents: number) {
  const subtotal = Math.round(subtotalCents);
  const serviceFee = Math.round((subtotal * CUSTOMER_SERVICE_FEE_PERCENT) / 100);
  const platformFee = Math.round((subtotal * PLATFORM_FEE_PERCENT) / 100);
  return {
    subtotal_cents: subtotal,
    service_fee_cents: serviceFee,
    platform_fee_cents: platformFee,
    total_cents: subtotal + serviceFee,
    application_fee_cents: platformFee + serviceFee,
  };
}

export function formatCents(cents: number | null | undefined) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((cents ?? 0) / 100);
}
