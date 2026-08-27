import "server-only";

import { createHash } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { getDb, requireDb } from "../firebase/admin";
import { buildListingSlug } from "../slug";
import { COLLECTIONS, toBidPayment } from "./collections";
import { computeRanks, getListingById } from "./listings";
import type {
  ActivityEventDoc,
  BidPayment,
  BidPaymentDoc,
  Listing,
  ListingDoc,
} from "./types";
import type { CategorySlug } from "../categories";

/**
 * A listing's document id is derived from its normalized website, so the same site can
 * never produce two listings - Firestore itself enforces the uniqueness.
 */
export function listingIdForWebsite(normalizedWebsite: string): string {
  return createHash("sha256").update(normalizedWebsite).digest("hex").slice(0, 24);
}

export type EnsureListingInput = {
  name: string;
  normalizedWebsite: string;
  displayWebsite: string;
  category: CategorySlug;
  bio: string;
};

export type EnsureListingResult = {
  listingId: string;
  listing: Listing;
  created: boolean;
};

/**
 * Finds the listing for this website or creates a pending one. A pending listing is not
 * ranked, not counted and not publicly visible until a payment is verified.
 */
export async function ensureListing(input: EnsureListingInput): Promise<EnsureListingResult> {
  const db = requireDb();
  const listingId = listingIdForWebsite(input.normalizedWebsite);
  const ref = db.collection(COLLECTIONS.listings).doc(listingId);
  const now = Timestamp.now();

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);

    if (snap.exists) {
      const doc = snap.data() as ListingDoc;
      // A previously-abandoned pending listing can be refreshed with the new submission;
      // an active listing's public fields are immutable from the bidding flow.
      if (doc.status === "pending") {
        const refreshed: Partial<ListingDoc> = {
          name: input.name,
          category: input.category,
          bio: input.bio,
          displayWebsite: input.displayWebsite,
          updatedAt: now,
        };
        tx.update(ref, refreshed);
        return {
          listingId,
          created: false,
          listing: materialise(listingId, { ...doc, ...refreshed } as ListingDoc),
        };
      }
      return { listingId, created: false, listing: materialise(listingId, doc) };
    }

    const doc: ListingDoc = {
      name: input.name,
      slug: buildListingSlug(input.name),
      normalizedWebsite: input.normalizedWebsite,
      displayWebsite: input.displayWebsite,
      category: input.category,
      bio: input.bio,
      standingBidCents: 0,
      standingBidReachedAt: now,
      totalClicks: 0,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    };
    tx.create(ref, doc);
    return { listingId, created: true, listing: materialise(listingId, doc) };
  });
}

function materialise(id: string, doc: ListingDoc): Listing {
  return {
    id,
    name: doc.name,
    slug: doc.slug,
    normalizedWebsite: doc.normalizedWebsite,
    displayWebsite: doc.displayWebsite,
    category: doc.category,
    bio: doc.bio,
    standingBidCents: doc.standingBidCents ?? 0,
    standingBidReachedAtMs: doc.standingBidReachedAt?.toMillis?.() ?? Date.now(),
    totalClicks: doc.totalClicks ?? 0,
    status: doc.status,
    createdAtMs: doc.createdAt?.toMillis?.() ?? Date.now(),
    updatedAtMs: doc.updatedAt?.toMillis?.() ?? Date.now(),
  };
}

export type CreateBidPaymentInput = {
  listingId: string;
  incrementCents: number;
  previousStandingBidCents: number;
  intendedStandingBidCents: number;
};

export async function createPendingBidPayment(input: CreateBidPaymentInput): Promise<string> {
  const db = requireDb();
  const ref = db.collection(COLLECTIONS.bidPayments).doc();
  const doc: BidPaymentDoc = {
    listingId: input.listingId,
    incrementCents: input.incrementCents,
    previousStandingBidCents: input.previousStandingBidCents,
    intendedStandingBidCents: input.intendedStandingBidCents,
    resultingStandingBidCents: null,
    dodoPaymentId: null,
    dodoSessionId: null,
    status: "pending",
    publishedListing: false,
    createdAt: Timestamp.now(),
    paidAt: null,
  };
  await ref.set(doc);
  return ref.id;
}

export async function attachCheckoutSession(paymentId: string, sessionId: string): Promise<void> {
  const db = requireDb();
  await db.collection(COLLECTIONS.bidPayments).doc(paymentId).update({ dodoSessionId: sessionId });
}

export async function markBidPaymentFailed(paymentId: string): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db
    .collection(COLLECTIONS.bidPayments)
    .doc(paymentId)
    .set({ status: "failed" }, { merge: true })
    .catch((error) => console.error("[payments] markBidPaymentFailed:", error));
}

export type ProcessBidResult =
  | { outcome: "credited"; paymentId: string; listingId: string }
  | { outcome: "already_credited"; paymentId: string; listingId: string }
  | { outcome: "unknown_payment"; paymentId: string }
  | { outcome: "missing_listing"; paymentId: string };

/**
 * Credits a verified leaderboard payment. Idempotent on `dodoPaymentId`: five identical
 * webhook deliveries move the standing bid exactly once.
 *
 * Bids are cumulative and applied as an increment, never as an assignment, so a payment
 * that lands after another payment for the same coach still adds correctly.
 */
export async function processVerifiedBidPayment(args: {
  internalPaymentId: string;
  dodoPaymentId: string;
  paidAt?: Date;
}): Promise<ProcessBidResult> {
  const db = requireDb();
  const paidAt = Timestamp.fromDate(args.paidAt ?? new Date());

  const paymentRef = db.collection(COLLECTIONS.bidPayments).doc(args.internalPaymentId);
  const webhookRef = db.collection(COLLECTIONS.processedWebhooks).doc(args.dodoPaymentId);
  const statsRef = db.collection(COLLECTIONS.stats).doc("site");

  const result = await db.runTransaction<ProcessBidResult>(async (tx) => {
    const [paymentSnap, webhookSnap] = await Promise.all([tx.get(paymentRef), tx.get(webhookRef)]);

    if (!paymentSnap.exists) {
      return { outcome: "unknown_payment", paymentId: args.internalPaymentId };
    }
    const payment = paymentSnap.data() as BidPaymentDoc;

    // Two independent guards: the idempotency key and the payment's own status.
    if (webhookSnap.exists || payment.status === "paid") {
      return {
        outcome: "already_credited",
        paymentId: args.internalPaymentId,
        listingId: payment.listingId,
      };
    }

    const listingRef = db.collection(COLLECTIONS.listings).doc(payment.listingId);
    const listingSnap = await tx.get(listingRef);
    if (!listingSnap.exists) {
      tx.update(paymentRef, { status: "failed" });
      return { outcome: "missing_listing", paymentId: args.internalPaymentId };
    }

    const listing = listingSnap.data() as ListingDoc;
    const previous = listing.standingBidCents ?? 0;
    const resulting = previous + payment.incrementCents;
    const wasPending = listing.status === "pending";

    tx.update(listingRef, {
      standingBidCents: resulting,
      standingBidReachedAt: paidAt,
      // A hidden listing stays hidden; moderation decisions outrank payment.
      status: listing.status === "hidden" ? "hidden" : "active",
      updatedAt: paidAt,
    });

    tx.update(paymentRef, {
      status: "paid",
      paidAt,
      dodoPaymentId: args.dodoPaymentId,
      previousStandingBidCents: previous,
      resultingStandingBidCents: resulting,
      publishedListing: wasPending,
    });

    tx.set(webhookRef, {
      kind: "bid",
      internalPaymentId: args.internalPaymentId,
      listingId: payment.listingId,
      processedAt: paidAt,
    });

    tx.set(
      statsRef,
      {
        leaderboardRevenueCents: FieldValue.increment(payment.incrementCents),
        listedCoaches: FieldValue.increment(wasPending && listing.status !== "hidden" ? 1 : 0),
      },
      { merge: true },
    );

    return {
      outcome: "credited",
      paymentId: args.internalPaymentId,
      listingId: payment.listingId,
    };
  });

  // Ranks and the activity event are settled after the money is committed, and are safe to
  // re-run: the event id is derived from the payment id, so `create` enforces exactly-once.
  if (result.outcome === "credited" || result.outcome === "already_credited") {
    await finalizeBidPayment(result.paymentId, result.listingId).catch((error) =>
      console.error("[payments] finalize failed:", error),
    );
  }

  return result;
}

/**
 * Stamps resulting ranks on the payment and publishes exactly one activity event.
 * Safe to call repeatedly - a retried webhook heals a partially-finalised payment.
 */
export async function finalizeBidPayment(paymentId: string, listingId: string): Promise<void> {
  const db = requireDb();

  const [listing, paymentSnap] = await Promise.all([
    getListingById(listingId),
    db.collection(COLLECTIONS.bidPayments).doc(paymentId).get(),
  ]);
  if (!listing || !paymentSnap.exists) return;

  const payment = paymentSnap.data() as BidPaymentDoc;
  if (payment.status !== "paid") return;

  const ranks = await computeRanks(listing);

  await db
    .collection(COLLECTIONS.bidPayments)
    .doc(paymentId)
    .update({
      resultingOverallRank: ranks.overallRank,
      resultingCategoryRank: ranks.categoryRank,
    });

  // Hidden listings never appear in the public feed.
  if (listing.status !== "active") return;

  const eventDoc: ActivityEventDoc = {
    type: "bid",
    listingId,
    listingSlug: listing.slug,
    coachName: listing.name,
    category: listing.category,
    displayWebsite: listing.displayWebsite,
    paymentIncrementCents: payment.incrementCents,
    resultingStandingBidCents: payment.resultingStandingBidCents ?? listing.standingBidCents,
    resultingOverallRank: ranks.overallRank,
    resultingCategoryRank: ranks.categoryRank,
    visible: true,
    createdAt: payment.paidAt ?? Timestamp.now(),
  };

  try {
    await db.collection(COLLECTIONS.activityEvents).doc(paymentId).create(eventDoc);
  } catch {
    // Already exists - this webhook was a duplicate delivery. Nothing to do.
  }
}

export async function getBidPayment(paymentId: string): Promise<BidPayment | null> {
  const db = getDb();
  if (!db || !paymentId) return null;
  try {
    const snap = await db.collection(COLLECTIONS.bidPayments).doc(paymentId).get();
    if (!snap.exists) return null;
    return toBidPayment(snap.id, snap.data() as BidPaymentDoc);
  } catch (error) {
    console.error("[payments] getBidPayment failed:", error);
    return null;
  }
}

/** Every paid leaderboard payment inside the rolling Today window. */
export async function getPaidPaymentsSince(since: Date, limit = 1000) {
  const db = getDb();
  if (!db) return [];
  try {
    const snap = await db
      .collection(COLLECTIONS.bidPayments)
      .where("status", "==", "paid")
      .where("paidAt", ">", Timestamp.fromDate(since))
      .orderBy("paidAt", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((d) => {
      const doc = d.data() as BidPaymentDoc;
      return {
        listingId: doc.listingId,
        incrementCents: doc.incrementCents,
        paidAtMs: doc.paidAt?.toMillis?.() ?? 0,
      };
    });
  } catch (error) {
    console.error("[payments] getPaidPaymentsSince failed:", error);
    return [];
  }
}

/** Admin surface: read-only payment history. */
export async function listRecentPayments(limit = 100): Promise<BidPayment[]> {
  const db = getDb();
  if (!db) return [];
  try {
    const snap = await db
      .collection(COLLECTIONS.bidPayments)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((d) => toBidPayment(d.id, d.data() as BidPaymentDoc));
  } catch (error) {
    console.error("[payments] listRecentPayments failed:", error);
    return [];
  }
}
