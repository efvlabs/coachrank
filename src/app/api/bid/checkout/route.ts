import { jsonError, jsonOk, rateLimited, readJson } from "@/lib/api";
import { isCategorySlug } from "@/lib/categories";
import { absoluteUrl } from "@/lib/config";
import { BIO_REJECTION_MESSAGE, validateBio } from "@/lib/bio";
import { bidProductId, createCheckoutSession, isDodoConfigured } from "@/lib/dodo";
import { isFirebaseConfigured } from "@/lib/firebase/admin";
import {
  getListingByNormalizedWebsite,
  getTopStandingBidExcludingCents,
} from "@/lib/domain/listings";
import {
  attachCheckoutSession,
  createPendingBidPayment,
  ensureListing,
  listingIdForWebsite,
  markBidPaymentFailed,
} from "@/lib/domain/payments";
import { getPricing } from "@/lib/domain/settings";
import { formatCents, parseDollarsToCents } from "@/lib/money";
import { MODERATION_MESSAGE, NAME_MESSAGE, screenBio, screenWebsite, validateName } from "@/lib/moderation";
import { bidValidationMessage, validateTargetBid } from "@/lib/ranking";
import { URL_MESSAGE, normalizeWebsite } from "@/lib/url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  name?: string;
  website?: string;
  category?: string;
  bio?: string;
  amount?: string | number;
  email?: string;
  acceptedTerms?: boolean;
};

export async function POST(request: Request) {
  if (rateLimited(request, "bid-checkout", 10, 60_000)) {
    return jsonError("Too many attempts. Give it a moment.", 429);
  }

  if (!isFirebaseConfigured()) {
    return jsonError("The board is not accepting bids right now.", 503);
  }
  const productId = bidProductId();
  if (!isDodoConfigured() || !productId) {
    return jsonError("Payments are not available right now.", 503);
  }

  const body = await readJson<Body>(request);
  if (!body) return jsonError("Invalid request.");

  // Nothing is charged without the buyer affirming the Terms, and the affirmation is
  // recorded on the payment so we can show what they agreed to and when.
  if (body.acceptedTerms !== true) {
    return jsonError("Tick the box to agree to the Terms of Service.", 400, {
      field: "terms",
    });
  }

  // --- Website is the identity of a listing, so it is validated first. -------------------
  const urlResult = normalizeWebsite(body.website);
  if (!urlResult.ok) {
    return jsonError(URL_MESSAGE[urlResult.reason] ?? "Enter a valid website.", 400, {
      field: "website",
    });
  }
  const { normalized, display, host } = urlResult.value;

  const siteFlag = screenWebsite(host);
  if (siteFlag) return jsonError(MODERATION_MESSAGE[siteFlag], 400, { field: "website" });

  const amountCents = parseDollarsToCents(body.amount ?? null);
  if (amountCents === null) return jsonError("Enter a valid amount.", 400, { field: "amount" });

  const [pricing, existing] = await Promise.all([
    getPricing(),
    getListingByNormalizedWebsite(normalized),
  ]);

  const isExistingActive = Boolean(existing && existing.status === "active");
  if (existing?.status === "hidden") {
    return jsonError("That listing is under review and cannot take new bids.", 403, {
      field: "website",
    });
  }

  // --- Name, category and bio are only collected for a listing that does not exist yet.
  // An active listing's public fields are never editable from the public bidding flow. ----
  let name: string;
  let category: string;
  let bio: string;

  if (isExistingActive && existing) {
    name = existing.name;
    category = existing.category;
    bio = existing.bio;
  } else {
    const nameResult = validateName(body.name);
    if (!nameResult.ok) {
      return jsonError(NAME_MESSAGE[nameResult.reason], 400, { field: "name" });
    }
    if (!isCategorySlug(body.category)) {
      return jsonError("Pick a category from the list.", 400, { field: "category" });
    }
    // A listing is a name, a website and a category. A bio is optional and only ever
    // added later from /admin, but it is still screened when one is supplied.
    if (body.bio) {
      const bioResult = validateBio(body.bio);
      if (!bioResult.ok) {
        return jsonError(BIO_REJECTION_MESSAGE[bioResult.reason], 400, { field: "bio" });
      }
      const bioFlag = screenBio(bioResult.value);
      if (bioFlag) return jsonError(MODERATION_MESSAGE[bioFlag], 400, { field: "bio" });
      bio = bioResult.value;
    } else {
      bio = "";
    }

    name = nameResult.value;
    category = body.category;
  }

  // --- Ranking rules. Bids are cumulative, so we charge only the difference. -------------
  const currentStandingBidCents = isExistingActive && existing ? existing.standingBidCents : 0;
  const selfListingId = existing?.id ?? listingIdForWebsite(normalized);
  const topExcludingSelf = await getTopStandingBidExcludingCents(selfListingId);

  const validation = validateTargetBid({
    targetStandingBidCents: amountCents,
    currentStandingBidCents,
    currentTopCents: topExcludingSelf,
    topExcludingSelfCents: topExcludingSelf,
    pricing,
  });

  if (!validation.ok) {
    return jsonError(bidValidationMessage(validation.error, formatCents), 400, {
      field: "amount",
      code: validation.error.code,
    });
  }

  // --- Reserve the listing and the payment record, then hand off to Dodo. ---------------
  let paymentId: string | null = null;
  try {
    const ensured = await ensureListing({
      name,
      normalizedWebsite: normalized,
      displayWebsite: display,
      category: category as Parameters<typeof ensureListing>[0]["category"],
      bio,
    });

    paymentId = await createPendingBidPayment({
      acceptedTermsAt: new Date(),
      listingId: ensured.listingId,
      incrementCents: validation.incrementCents,
      previousStandingBidCents: currentStandingBidCents,
      intendedStandingBidCents: validation.targetStandingBidCents,
    });

    const session = await createCheckoutSession({
      productId,
      amountCents: validation.incrementCents,
      internalPaymentId: paymentId,
      kind: "bid",
      listingId: ensured.listingId,
      returnUrl: absoluteUrl(`/success?p=${paymentId}`),
      cancelUrl: absoluteUrl(`/?claim=${validation.targetStandingBidCents}#claim`),
      customerEmail: typeof body.email === "string" && body.email.includes("@") ? body.email : null,
      customerName: name,
    });

    await attachCheckoutSession(paymentId, session.sessionId);

    return jsonOk({
      checkoutUrl: session.checkoutUrl,
      paymentId,
      chargeCents: validation.incrementCents,
      targetStandingBidCents: validation.targetStandingBidCents,
    });
  } catch (error) {
    console.error("[bid/checkout] failed:", error);
    if (paymentId) await markBidPaymentFailed(paymentId);
    return jsonError("We could not start checkout. Try again in a moment.", 502);
  }
}
