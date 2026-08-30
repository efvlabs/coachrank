import { jsonError, jsonOk, rateLimited, readJson } from "@/lib/api";
import { isCategorySlug } from "@/lib/categories";
import { COLLECTIONS } from "@/lib/domain/collections";
import { getListingByNormalizedWebsite } from "@/lib/domain/listings";
import { listingIdForWebsite } from "@/lib/domain/payments";
import { getDb, isFirebaseConfigured } from "@/lib/firebase/admin";
import { MODERATION_MESSAGE, NAME_MESSAGE, screenWebsite, validateName } from "@/lib/moderation";
import { newEditToken } from "@/lib/domain/profile";
import { buildListingSlug } from "@/lib/slug";
import { normalizeWebsite, URL_MESSAGE } from "@/lib/url";
import { Timestamp } from "firebase-admin/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { name?: string; website?: string; category?: string };

/**
 * Free enrolment. Nothing here reaches the leaderboard - a submission waits for a human,
 * and an approved coach sits in the grid holding no rank, because rank is the amount paid.
 *
 * The screening is the same as the paid flow's. Money used to be the filter that kept
 * this clean; with the money gone, the filter has to be a person.
 */
export async function POST(request: Request) {
  if (rateLimited(request, "enroll", 5, 60_000)) {
    return jsonError("Too many attempts. Give it a moment.", 429);
  }
  if (!isFirebaseConfigured()) return jsonError("Enrolment is unavailable right now.", 503);

  const body = await readJson<Body>(request);
  if (!body) return jsonError("Invalid request.");

  const parsed = normalizeWebsite(body.website);
  if (!parsed.ok) {
    return jsonError(URL_MESSAGE[parsed.reason] ?? "Enter a valid website.", 400, {
      field: "website",
    });
  }

  const siteFlag = screenWebsite(parsed.value.host);
  if (siteFlag) return jsonError(MODERATION_MESSAGE[siteFlag], 400, { field: "website" });

  const nameResult = validateName(body.name);
  if (!nameResult.ok) {
    return jsonError(NAME_MESSAGE[nameResult.reason], 400, { field: "name" });
  }
  if (!isCategorySlug(body.category)) {
    return jsonError("Pick a category from the list.", 400, { field: "category" });
  }

  const existing = await getListingByNormalizedWebsite(parsed.value.normalized);
  if (existing) {
    if (existing.status === "submitted") {
      return jsonOk({ status: "already_submitted" });
    }
    // Already on the board, in the grid, or taken down - all cases where a second
    // enrolment would either duplicate a listing or quietly undo a moderation decision.
    return jsonError("That website is already on CoachRank.", 409, { field: "website" });
  }

  const db = getDb();
  if (!db) return jsonError("Enrolment is unavailable right now.", 503);

  const now = Timestamp.now();
  const id = listingIdForWebsite(parsed.value.normalized);
  try {
    await db
      .collection(COLLECTIONS.listings)
      .doc(id)
      .create({
        name: nameResult.value,
        slug: buildListingSlug(nameResult.value),
        normalizedWebsite: parsed.value.normalized,
        displayWebsite: parsed.value.display,
        category: body.category,
        bio: "",
        standingBidCents: 0,
        standingBidReachedAt: now,
        totalClicks: 0,
        status: "submitted",
        enrolledAt: now,
        editToken: newEditToken(),
        createdAt: now,
        updatedAt: now,
      });
  } catch {
    // Deterministic ids make a race a duplicate rather than a second listing.
    return jsonOk({ status: "already_submitted" });
  }

  return jsonOk({ status: "submitted" });
}
