import { jsonError, jsonOk, rateLimited } from "@/lib/api";
import { computeRanks, getListingById } from "@/lib/domain/listings";
import { getBidPayment } from "@/lib/domain/payments";
import { getSpotlightBooking } from "@/lib/domain/spotlight";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Read-only status for the success screen while we wait for the webhook. This endpoint can
 * never credit anything — it only reports what verified processing has already recorded.
 */
export async function GET(request: Request) {
  if (rateLimited(request, "payment-status", 90, 60_000)) {
    return jsonError("Too many checks.", 429);
  }

  const url = new URL(request.url);
  const paymentId = url.searchParams.get("p");
  const bookingId = url.searchParams.get("s");

  if (bookingId) {
    const booking = await getSpotlightBooking(bookingId);
    if (!booking) return jsonError("Not found.", 404);
    return jsonOk({
      kind: "spotlight" as const,
      status: booking.status,
      endsAtMs: booking.endsAtMs,
      slot: booking.slot,
    });
  }

  if (!paymentId) return jsonError("Missing payment reference.", 400);

  const payment = await getBidPayment(paymentId);
  if (!payment) return jsonError("Not found.", 404);

  if (payment.status !== "paid") {
    return jsonOk({ kind: "bid" as const, status: payment.status });
  }

  const listing = await getListingById(payment.listingId);
  const ranks = listing ? await computeRanks(listing) : null;

  return jsonOk({
    kind: "bid" as const,
    status: payment.status,
    standingBidCents: payment.resultingStandingBidCents,
    overallRank: ranks?.overallRank ?? payment.resultingOverallRank,
    categoryRank: ranks?.categoryRank ?? payment.resultingCategoryRank,
    slug: listing?.slug ?? null,
  });
}
