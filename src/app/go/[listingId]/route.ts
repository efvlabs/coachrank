import { NextResponse, type NextRequest } from "next/server";

import { isClickSource } from "@/lib/config";
import { getListingById, recordOutboundClick } from "@/lib/domain/listings";
import { incrementStats } from "@/lib/domain/stats";
import { recordSpotlightClickForSlot } from "@/lib/domain/spotlight";
import { absoluteUrl } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Every outbound visit to a coach goes through here so clicks delivered is a real,
 * server-side number. The redirect happens whether or not the counters succeed —
 * a metrics failure must never cost a coach a visitor.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ listingId: string }> },
) {
  const { listingId } = await context.params;
  const listing = await getListingById(listingId);

  if (!listing || listing.status !== "active") {
    return NextResponse.redirect(absoluteUrl("/"), 302);
  }

  const rawSource = request.nextUrl.searchParams.get("source");
  const source = isClickSource(rawSource) ? rawSource : "leaderboard";

  try {
    await Promise.all([
      recordOutboundClick(listing.id, source),
      incrementStats({ outboundClicks: 1 }),
      source === "premium_spotlight"
        ? recordSpotlightClickForSlot("premium")
        : source === "standard_spotlight"
          ? recordSpotlightClickForSlot("standard")
          : Promise.resolve(),
    ]);
  } catch (error) {
    console.error("[go] click tracking failed, redirecting anyway:", error);
  }

  return NextResponse.redirect(listing.displayWebsite, {
    status: 302,
    headers: {
      // Outbound links are untrusted third-party destinations.
      "Referrer-Policy": "no-referrer",
      "Cache-Control": "no-store",
    },
  });
}
