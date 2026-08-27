import { jsonError, jsonOk, rateLimited, readJson } from "@/lib/api";
import { getListingByNormalizedWebsite } from "@/lib/domain/listings";
import { normalizeWebsite } from "@/lib/url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Only a coach already on the board can rent a Spotlight, so we resolve them by website. */
export async function POST(request: Request) {
  if (rateLimited(request, "spotlight-lookup", 30, 60_000)) {
    return jsonError("Too many lookups. Give it a moment.", 429);
  }

  const body = await readJson<{ website?: string }>(request);
  const parsed = normalizeWebsite(body?.website);
  if (!parsed.ok) return jsonOk({ found: false as const });

  const listing = await getListingByNormalizedWebsite(parsed.value.normalized);
  if (!listing || listing.status !== "active") return jsonOk({ found: false as const });

  return jsonOk({
    found: true as const,
    listing: {
      id: listing.id,
      name: listing.name,
      category: listing.category,
      bio: listing.bio,
      displayWebsite: listing.displayWebsite,
      standingBidCents: listing.standingBidCents,
    },
  });
}
