import { NextResponse, type NextRequest } from "next/server";

import { absoluteUrl, isClickSource } from "@/lib/config";
import { getListingById, recordOutboundClick } from "@/lib/domain/listings";
import { getSpotlightBooking, recordSpotlightClick } from "@/lib/domain/spotlight";
import { incrementStats } from "@/lib/domain/stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Outbound clicks from a Spotlight. A Spotlight is an advertisement and does not require a
 * rank, so the click is counted against the booking rather than a listing - and where the
 * advertiser does happen to be on the board, their listing's click count moves too.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ bookingId: string }> },
) {
  const { bookingId } = await context.params;
  const booking = await getSpotlightBooking(bookingId);

  // Only a running Spotlight redirects. An expired one is a dead ad, not a link.
  const live =
    booking && booking.status === "active" && booking.endsAtMs && booking.endsAtMs > Date.now();
  if (!booking || !live) return NextResponse.redirect(absoluteUrl("/"), 302);

  // Moderation reaches the ad too: a hidden coach's Spotlight stops sending traffic.
  if (booking.listingId) {
    const listing = await getListingById(booking.listingId);
    if (!listing || listing.status !== "active") {
      return NextResponse.redirect(absoluteUrl("/"), 302);
    }
  }

  const rawSource = request.nextUrl.searchParams.get("source");
  const source = isClickSource(rawSource) ? rawSource : "premium_spotlight";

  try {
    await Promise.all([
      recordSpotlightClick(booking.id),
      incrementStats({ outboundClicks: 1 }),
      booking.listingId
        ? recordOutboundClick(booking.listingId, source)
        : Promise.resolve(),
    ]);
  } catch (error) {
    console.error("[go/s] click tracking failed, redirecting anyway:", error);
  }

  return NextResponse.redirect(booking.advertiser.displayWebsite, {
    status: 302,
    headers: {
      // Outbound links are untrusted third-party destinations.
      "Referrer-Policy": "no-referrer",
      "Cache-Control": "no-store",
    },
  });
}
