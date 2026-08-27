import { jsonError, jsonOk, rateLimited, readJson } from "@/lib/api";
import { absoluteUrl } from "@/lib/config";
import { createCheckoutSession, isDodoConfigured, spotlightProductId } from "@/lib/dodo";
import { getListingByNormalizedWebsite } from "@/lib/domain/listings";
import { getPricing } from "@/lib/domain/settings";
import {
  SpotlightUnavailableError,
  attachSpotlightSession,
  isSpotlightSlot,
  releaseSpotlightHold,
  reserveSpotlight,
  spotlightPriceCents,
} from "@/lib/domain/spotlight";
import { isFirebaseConfigured } from "@/lib/firebase/admin";
import { normalizeWebsite } from "@/lib/url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { website?: string; slot?: string; email?: string };

export async function POST(request: Request) {
  if (rateLimited(request, "spotlight-checkout", 8, 60_000)) {
    return jsonError("Too many attempts. Give it a moment.", 429);
  }
  if (!isFirebaseConfigured()) return jsonError("Spotlights are unavailable right now.", 503);

  const productId = spotlightProductId();
  if (!isDodoConfigured() || !productId) {
    return jsonError("Payments are not available right now.", 503);
  }

  const body = await readJson<Body>(request);
  if (!isSpotlightSlot(body?.slot)) return jsonError("Pick a Spotlight slot.", 400);
  const slot = body.slot;

  const parsed = normalizeWebsite(body?.website);
  if (!parsed.ok) return jsonError("Enter the website you are listed with.", 400, { field: "website" });

  const listing = await getListingByNormalizedWebsite(parsed.value.normalized);
  if (!listing || listing.status !== "active") {
    return jsonError(
      "We could not find that website on the board. Claim a rank first, then rent a Spotlight.",
      404,
      { field: "website" },
    );
  }

  const pricing = await getPricing();
  const priceCents = spotlightPriceCents(slot, pricing);

  // The hold is what stops two buyers reaching checkout for the same 24-hour slot.
  let bookingId: string;
  try {
    bookingId = await reserveSpotlight({ slot, listingId: listing.id, priceCents });
  } catch (error) {
    if (error instanceof SpotlightUnavailableError) {
      return jsonError(
        error.reason === "held"
          ? "Someone is checking out for this spot right now. Try again in a few minutes."
          : "That Spotlight is taken until the countdown runs out.",
        409,
        { reason: error.reason, availableAtMs: error.availableAtMs },
      );
    }
    console.error("[spotlight/checkout] reservation failed:", error);
    return jsonError("We could not reserve that spot. Try again.", 502);
  }

  try {
    const session = await createCheckoutSession({
      productId,
      amountCents: priceCents,
      internalPaymentId: bookingId,
      kind: "spotlight",
      listingId: listing.id,
      returnUrl: absoluteUrl(`/success?s=${bookingId}`),
      cancelUrl: absoluteUrl("/#board"),
      customerEmail: typeof body.email === "string" && body.email.includes("@") ? body.email : null,
      customerName: listing.name,
    });

    await attachSpotlightSession(bookingId, session.sessionId);

    return jsonOk({ checkoutUrl: session.checkoutUrl, bookingId, priceCents });
  } catch (error) {
    console.error("[spotlight/checkout] failed:", error);
    // Free the slot immediately rather than making the next buyer wait out the hold.
    await releaseSpotlightHold(slot, bookingId);
    return jsonError("We could not start checkout. Try again in a moment.", 502);
  }
}
