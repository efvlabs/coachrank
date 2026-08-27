import { jsonError, jsonOk, rateLimited, readJson } from "@/lib/api";
import { getPricing } from "@/lib/domain/settings";
import {
  computeRanks,
  getListingByNormalizedWebsite,
  getTopStandingBidCents,
  getTopStandingBidExcludingCents,
} from "@/lib/domain/listings";
import { priceToClaimTopCents } from "@/lib/ranking";
import { normalizeWebsite } from "@/lib/url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { website?: string };

/**
 * Recognises a website that is already on the board so the form can switch from
 * "new listing" to "raise your standing bid" and show the delta the coach will actually pay.
 */
export async function POST(request: Request) {
  if (rateLimited(request, "bid-lookup", 40, 60_000)) {
    return jsonError("Too many lookups. Give it a moment.", 429);
  }

  const body = await readJson<Body>(request);
  const parsed = normalizeWebsite(body?.website);
  if (!parsed.ok) return jsonOk({ found: false as const });

  const [listing, pricing, globalTop] = await Promise.all([
    getListingByNormalizedWebsite(parsed.value.normalized),
    getPricing(),
    getTopStandingBidCents(),
  ]);

  if (!listing || listing.status !== "active") {
    return jsonOk({
      found: false as const,
      claimTopCents: priceToClaimTopCents(globalTop, pricing),
      minNewBidCents: pricing.minNewBidCents,
    });
  }

  const [ranks, topExcludingSelf] = await Promise.all([
    computeRanks(listing),
    getTopStandingBidExcludingCents(listing.id),
  ]);

  return jsonOk({
    found: true as const,
    listing: {
      id: listing.id,
      name: listing.name,
      slug: listing.slug,
      category: listing.category,
      bio: listing.bio,
      displayWebsite: listing.displayWebsite,
      standingBidCents: listing.standingBidCents,
      overallRank: ranks.overallRank,
      categoryRank: ranks.categoryRank,
    },
    claimTopCents: priceToClaimTopCents(topExcludingSelf, pricing),
    minNextCents: listing.standingBidCents + pricing.standardIncrementCents,
    minNewBidCents: pricing.minNewBidCents,
  });
}
