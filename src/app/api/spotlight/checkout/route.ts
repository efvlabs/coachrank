import { jsonError, jsonOk, rateLimited, readJson } from "@/lib/api";
import { absoluteUrl } from "@/lib/config";
import { createCheckoutSession, isDodoConfigured, spotlightProductId } from "@/lib/dodo";
import { isCategorySlug } from "@/lib/categories";
import { getListingByNormalizedWebsite } from "@/lib/domain/listings";
import { MODERATION_MESSAGE, NAME_MESSAGE, screenWebsite, validateName } from "@/lib/moderation";
import type { SpotlightAdvertiser } from "@/lib/domain/types";
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

type Body = {
  website?: string;
  slot?: string;
  email?: string;
  acceptedTerms?: boolean;
  /** Only needed when the advertiser is not already on the board. */
  name?: string;
  category?: string;
};

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
  if (body?.acceptedTerms !== true) {
    return jsonError("Tick the box to agree to the Terms of Service.", 400, {
      field: "terms",
    });
  }
  if (!isSpotlightSlot(body?.slot)) return jsonError("Pick a Spotlight slot.", 400);
  const slot = body.slot;

  const parsed = normalizeWebsite(body?.website);
  if (!parsed.ok) return jsonError("Enter the website the ad should link to.", 400, { field: "website" });

  const listing = await getListingByNormalizedWebsite(parsed.value.normalized);

  // A hidden coach cannot buy their way back onto the page through the ad slot.
  if (listing && listing.status === "hidden") {
    return jsonError("That website is under review and cannot rent a Spotlight.", 403, {
      field: "website",
    });
  }

  // A Spotlight is an advertisement, so a rank is not required. Where the advertiser is
  // already on the board we reuse their listing rather than letting the ad restate it;
  // otherwise we take and screen the details here, to the same standard as a listing.
  let advertiser: SpotlightAdvertiser;

  if (listing && listing.status === "active") {
    advertiser = {
      name: listing.name,
      normalizedWebsite: listing.normalizedWebsite,
      displayWebsite: listing.displayWebsite,
      category: listing.category,
    };
  } else {
    const siteFlag = screenWebsite(parsed.value.host);
    if (siteFlag) return jsonError(MODERATION_MESSAGE[siteFlag], 400, { field: "website" });

    const nameResult = validateName(body.name);
    if (!nameResult.ok) {
      return jsonError(NAME_MESSAGE[nameResult.reason], 400, { field: "name" });
    }
    if (!isCategorySlug(body.category)) {
      return jsonError("Pick a category from the list.", 400, { field: "category" });
    }

    advertiser = {
      name: nameResult.value,
      normalizedWebsite: parsed.value.normalized,
      displayWebsite: parsed.value.display,
      category: body.category,
    };
  }

  const pricing = await getPricing();
  const priceCents = spotlightPriceCents(slot, pricing);

  // The hold is what stops two buyers reaching checkout for the same 24-hour slot.
  let bookingId: string;
  try {
    bookingId = await reserveSpotlight({
      slot,
      advertiser,
      listingId: listing?.status === "active" ? listing.id : null,
      priceCents,
      acceptedTermsAt: new Date(),
    });
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
      listingId: listing?.id ?? "",
      returnUrl: absoluteUrl(`/success?s=${bookingId}`),
      cancelUrl: absoluteUrl("/#board"),
      customerEmail: typeof body.email === "string" && body.email.includes("@") ? body.email : null,
      customerName: advertiser.name,
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
