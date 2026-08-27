import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { netPaidUsdCents, readCheckoutMetadata, verifyWebhook } from "@/lib/dodo";
import {
  markBidPaymentFailed,
  processVerifiedBidPayment,
  reverseBidPayment,
} from "@/lib/domain/payments";
import {
  abandonSpotlightBooking,
  endSpotlightForPayment,
  processVerifiedSpotlightPayment,
} from "@/lib/domain/spotlight";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The only thing on CoachRank that may publish a listing, move a standing bid or light up a
 * Spotlight. A browser redirect proves nothing; a signature-verified Dodo event does.
 *
 * Guarantees:
 *   • authenticated - Standard Webhooks signature, verified by the Dodo SDK
 *   • idempotent    - keyed on the Dodo payment id, so N deliveries credit exactly once
 *   • transactional - money, listing state and stats move together or not at all
 *   • ordered-safe  - bids are applied as increments, never assignments
 */
export async function POST(request: Request) {
  const raw = await request.text();
  const headerList = await headers();

  const webhookId = headerList.get("webhook-id");
  const webhookSignature = headerList.get("webhook-signature");
  const webhookTimestamp = headerList.get("webhook-timestamp");

  if (!webhookId || !webhookSignature || !webhookTimestamp) {
    return NextResponse.json({ error: "Missing webhook headers" }, { status: 400 });
  }

  let event;
  try {
    event = verifyWebhook(raw, {
      "webhook-id": webhookId,
      "webhook-signature": webhookSignature,
      "webhook-timestamp": webhookTimestamp,
    });
  } catch (error) {
    console.error("[dodo-webhook] signature verification failed:", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  try {
    switch (event.type) {
      case "payment.succeeded": {
        const payment = event.data;
        const meta = readCheckoutMetadata(payment.metadata);

        if (!meta.internalPaymentId || !meta.kind) {
          console.warn("[dodo-webhook] payment.succeeded without CoachRank metadata:", payment.payment_id);
          return NextResponse.json({ received: true, ignored: "no_metadata" });
        }

        const paidAt = payment.created_at ? new Date(payment.created_at) : new Date();
        const safePaidAt = Number.isNaN(paidAt.getTime()) ? new Date() : paidAt;

        if (meta.kind === "bid") {
          const result = await processVerifiedBidPayment({
            internalPaymentId: meta.internalPaymentId,
            dodoPaymentId: payment.payment_id,
            paidAt: safePaidAt,
            paidNetCents: netPaidUsdCents(payment),
          });
          console.info("[dodo-webhook] bid", payment.payment_id, "->", result.outcome);
          return NextResponse.json({ received: true, outcome: result.outcome });
        }

        const result = await processVerifiedSpotlightPayment({
          bookingId: meta.internalPaymentId,
          dodoPaymentId: payment.payment_id,
          paidAt: safePaidAt,
        });
        if (result.outcome === "conflict") {
          console.error(
            "[dodo-webhook] spotlight slot was already taken; booking flagged for refund:",
            result.bookingId,
          );
        }
        console.info("[dodo-webhook] spotlight", payment.payment_id, "->", result.outcome);
        return NextResponse.json({ received: true, outcome: result.outcome });
      }

      case "payment.failed":
      case "payment.cancelled": {
        const payment = event.data;
        const meta = readCheckoutMetadata(payment.metadata);
        if (meta.internalPaymentId) {
          if (meta.kind === "bid") await markBidPaymentFailed(meta.internalPaymentId);
          // Otherwise the hold squats the slot until it lapses on its own.
          if (meta.kind === "spotlight") await abandonSpotlightBooking(meta.internalPaymentId);
        }
        // A failed payment publishes nothing and generates no activity event.
        return NextResponse.json({ received: true, outcome: "marked_failed" });
      }

      // Money that goes back takes the rank with it. A cardholder cannot buy #1, charge
      // it back, and keep the place - and neither can a refunded Spotlight keep running.
      case "refund.succeeded":
      case "dispute.lost":
      case "dispute.accepted": {
        const reason = event.type === "refund.succeeded" ? "refund" : "dispute";
        const dodoPaymentId = event.data.payment_id;
        const reference =
          event.type === "refund.succeeded" ? event.data.refund_id : event.data.dispute_id;

        const bid = await reverseBidPayment({ dodoPaymentId, reason, reference });
        if (bid.outcome === "reversed" || bid.outcome === "already_reversed") {
          console.info("[dodo-webhook]", event.type, dodoPaymentId, "->", bid.outcome);
          return NextResponse.json({ received: true, outcome: bid.outcome });
        }

        const spotlight = await endSpotlightForPayment({ dodoPaymentId, reason, reference });
        console.info("[dodo-webhook]", event.type, dodoPaymentId, "-> spotlight", spotlight);
        return NextResponse.json({ received: true, outcome: spotlight });
      }

      default:
        return NextResponse.json({ received: true, ignored: event.type });
    }
  } catch (error) {
    // A non-2xx makes Dodo retry with backoff; every handler above is safe to re-run.
    console.error("[dodo-webhook] processing failed:", error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
