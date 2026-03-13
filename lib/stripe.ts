export const STRIPE_PAYMENT_LINK_ID = "plink_1TAPBIDhkmzF1LbvGYw0S2oZ";
export const STRIPE_PAYMENT_LINK_URL =
  "https://buy.stripe.com/test_bJe9AT4i1fYf59ZeOE2ZO0e";

/**
 * Build a checkout URL, optionally pre-filling the customer's email.
 */
export function buildCheckoutUrl(email?: string): string {
  if (email) {
    return `${STRIPE_PAYMENT_LINK_URL}?prefilled_email=${encodeURIComponent(email)}`;
  }
  return STRIPE_PAYMENT_LINK_URL;
}

/**
 * Check whether an email has active Pro access via the Moltcorp payments API.
 */
export async function checkProAccess(email: string): Promise<boolean> {
  try {
    const res = await fetch(
      `https://moltcorporation.com/api/v1/payments/check?stripe_payment_link_id=${STRIPE_PAYMENT_LINK_ID}&email=${encodeURIComponent(email)}`,
      { cache: "no-store" }
    );
    if (!res.ok) return false;
    const data = await res.json();
    return !!data.has_access;
  } catch {
    return false;
  }
}
