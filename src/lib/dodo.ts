import "server-only";

import DodoPayments from "dodopayments";
import type { UnwrapWebhookEvent } from "dodopayments/resources/webhooks/webhooks";

import { absoluteUrl } from "./config";

export type DodoEnvironment = "test_mode" | "live_mode";

function environment(): DodoEnvironment {
  return process.env.DODO_PAYMENTS_ENVIRONMENT === "live_mode" ? "live_mode" : "test_mode";
}

let client: DodoPayments | null | undefined;

export function getDodoClient(): DodoPayments | null {
  if (client !== undefined) return client;
  const bearerToken = process.env.DODO_PAYMENTS_API_KEY;
  if (!bearerToken) {
    client = null;
    return null;
  }
  client = new DodoPayments({
    bearerToken,
    environment: environment(),
    webhookKey: process.env.DODO_PAYMENTS_WEBHOOK_KEY ?? null,
  });
  return client;
}

export function requireDodoClient(): DodoPayments {
  const c = getDodoClient();
  if (!c) throw new Error("Dodo Payments is not configured. Set DODO_PAYMENTS_API_KEY.");
  return c;
}

/**
 * A switch that turns checkout off without touching the secrets. Dodo refuses live
 * payments until merchant verification is approved, and an outage is possible after that,
 * so there has to be a way to close the till and leave the board running - which is
 * exactly what the site already does when payments are unavailable.
 */
export function paymentsDisabled(): boolean {
  return process.env.PAYMENTS_ENABLED === "false";
}

export function isDodoConfigured(): boolean {
  if (paymentsDisabled()) return false;
  return Boolean(process.env.DODO_PAYMENTS_API_KEY && bidProductId());
}

/**
 * Both products are one-time "pay what you want" products in the Dodo dashboard, which is
 * what lets us set the exact amount per checkout - a $10 top-up and a $505 claim for #1
 * are the same product at different amounts.
 */
export function bidProductId(): string | null {
  return process.env.DODO_BID_PRODUCT_ID || null;
}

export function spotlightProductId(): string | null {
  return process.env.DODO_SPOTLIGHT_PRODUCT_ID || bidProductId();
}

export type CheckoutRequest = {
  productId: string;
  amountCents: number;
  /** Our own payment document id - the key we reconcile the webhook against. */
  internalPaymentId: string;
  kind: "bid" | "spotlight";
  listingId: string;
  returnUrl: string;
  cancelUrl?: string;
  customerEmail?: string | null;
  customerName?: string | null;
};

export type CheckoutResult = { checkoutUrl: string; sessionId: string };

export async function createCheckoutSession(req: CheckoutRequest): Promise<CheckoutResult> {
  const dodo = requireDodoClient();

  const session = await dodo.checkoutSessions.create({
    product_cart: [
      {
        product_id: req.productId,
        quantity: 1,
        // Lowest denomination of the currency, i.e. cents for USD.
        amount: req.amountCents,
      },
    ],
    metadata: {
      cr_payment_id: req.internalPaymentId,
      cr_kind: req.kind,
      cr_listing_id: req.listingId,
      cr_amount_cents: req.amountCents,
    },
    return_url: req.returnUrl,
    cancel_url: req.cancelUrl ?? absoluteUrl("/"),
    customer:
      req.customerEmail
        ? { email: req.customerEmail, name: req.customerName ?? undefined }
        : undefined,
    customization: { show_order_details: true, theme: "light" },
    feature_flags: { allow_discount_code: false },
  });

  if (!session.checkout_url) {
    throw new Error("Dodo returned a checkout session without a checkout_url.");
  }
  return { checkoutUrl: session.checkout_url, sessionId: session.session_id };
}

export type DodoWebhookHeaders = {
  "webhook-id": string;
  "webhook-signature": string;
  "webhook-timestamp": string;
};

/**
 * Verifies the Standard Webhooks signature and returns the typed event.
 * Throws when the signature, timestamp or secret does not check out - the route turns
 * that into a 401 and nothing is credited.
 */
export function verifyWebhook(rawBody: string, headers: DodoWebhookHeaders): UnwrapWebhookEvent {
  const dodo = requireDodoClient();
  const key = process.env.DODO_PAYMENTS_WEBHOOK_KEY;
  if (!key) throw new Error("DODO_PAYMENTS_WEBHOOK_KEY is not set.");
  return dodo.webhooks.unwrap(rawBody, { headers, key });
}

export type CheckoutMetadata = {
  internalPaymentId: string | null;
  kind: "bid" | "spotlight" | null;
  listingId: string | null;
};

export function readCheckoutMetadata(metadata: Record<string, unknown> | null | undefined): CheckoutMetadata {
  const get = (key: string): string | null => {
    const value = metadata?.[key];
    return typeof value === "string" && value ? value : null;
  };
  const kind = get("cr_kind");
  return {
    internalPaymentId: get("cr_payment_id"),
    kind: kind === "bid" || kind === "spotlight" ? kind : null,
    listingId: get("cr_listing_id"),
  };
}

/**
 * What the buyer actually paid for the rank itself, in USD cents.
 *
 * `total_amount` is the whole charge including tax, and with adaptive pricing it can be
 * denominated in the buyer's own currency. We only trust the comparison when the payment
 * settled in USD; anywhere else we return null and fall back to the amount we asked for.
 */
export function netPaidUsdCents(payment: {
  currency?: string | null;
  total_amount?: number | null;
  tax?: number | null;
  settlement_currency?: string | null;
  settlement_amount?: number | null;
  settlement_tax?: number | null;
}): number | null {
  if (payment.currency === "USD" && typeof payment.total_amount === "number") {
    return payment.total_amount - (payment.tax ?? 0);
  }
  if (payment.settlement_currency === "USD" && typeof payment.settlement_amount === "number") {
    return payment.settlement_amount - (payment.settlement_tax ?? 0);
  }
  return null;
}

/** Belt-and-braces reconciliation for the success screen - never used to credit money. */
export async function fetchPaymentStatus(dodoPaymentId: string): Promise<string | null> {
  const dodo = getDodoClient();
  if (!dodo) return null;
  try {
    const payment = await dodo.payments.retrieve(dodoPaymentId);
    return (payment as { status?: string | null }).status ?? null;
  } catch (error) {
    console.error("[dodo] payment retrieve failed:", error);
    return null;
  }
}
