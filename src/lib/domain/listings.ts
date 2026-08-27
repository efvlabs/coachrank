import "server-only";

import { cache } from "react";
import { FieldValue, Timestamp, type Query } from "firebase-admin/firestore";

import { getDb } from "../firebase/admin";
import { rankListings, compareForRank } from "../ranking";
import { COLLECTIONS, toListing } from "./collections";
import type { CategorySlug } from "../categories";
import type { ClickSource } from "../config";
import type { Listing, ListingDoc, RankedListing } from "./types";

/**
 * How many active listings we pull in one ordered read to rank the board in memory.
 * One query beats N aggregation queries at launch scale; past this size individual ranks
 * are resolved with `computeRanks`, which uses Firestore count aggregations.
 */
export const RANK_WINDOW = 1000;

function listingsRef() {
  return getDb()?.collection(COLLECTIONS.listings) ?? null;
}

/** All rankable listings, ordered, ranked, deduplicated per request. */
export const getRankedBoard = cache(async (): Promise<RankedListing[]> => {
  const ref = listingsRef();
  if (!ref) return [];
  try {
    const snap = await ref
      .where("status", "==", "active")
      .orderBy("standingBidCents", "desc")
      .orderBy("standingBidReachedAt", "asc")
      .limit(RANK_WINDOW)
      .get();
    const listings = snap.docs.map((d) => toListing(d.id, d.data() as ListingDoc));
    return rankListings(listings);
  } catch (error) {
    console.error("[listings] getRankedBoard failed:", error);
    return [];
  }
});

export async function getBoardForCategory(category: CategorySlug): Promise<RankedListing[]> {
  const board = await getRankedBoard();
  return board.filter((l) => l.category === category);
}

export type BoardPage = {
  items: RankedListing[];
  page: number;
  pageCount: number;
  total: number;
};

export function paginate(items: RankedListing[], page: number, pageSize: number): BoardPage {
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, Math.trunc(page) || 1), pageCount);
  const start = (safePage - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), page: safePage, pageCount, total };
}

export async function getTopStandingBidCents(): Promise<number> {
  const ref = listingsRef();
  if (!ref) return 0;
  try {
    const snap = await ref
      .where("status", "==", "active")
      .orderBy("standingBidCents", "desc")
      .limit(1)
      .get();
    if (snap.empty) return 0;
    return (snap.docs[0].data() as ListingDoc).standingBidCents ?? 0;
  } catch (error) {
    console.error("[listings] getTopStandingBidCents failed:", error);
    return 0;
  }
}

export async function getTopStandingBidForCategoryCents(category: CategorySlug): Promise<number> {
  const ref = listingsRef();
  if (!ref) return 0;
  try {
    const snap = await ref
      .where("status", "==", "active")
      .where("category", "==", category)
      .orderBy("standingBidCents", "desc")
      .limit(1)
      .get();
    if (snap.empty) return 0;
    return (snap.docs[0].data() as ListingDoc).standingBidCents ?? 0;
  } catch (error) {
    console.error("[listings] getTopStandingBidForCategoryCents failed:", error);
    return 0;
  }
}

export async function getListingById(id: string): Promise<Listing | null> {
  const ref = listingsRef();
  if (!ref || !id) return null;
  try {
    const snap = await ref.doc(id).get();
    if (!snap.exists) return null;
    return toListing(snap.id, snap.data() as ListingDoc);
  } catch (error) {
    console.error("[listings] getListingById failed:", error);
    return null;
  }
}

async function findOne(build: (q: Query) => Query): Promise<Listing | null> {
  const ref = listingsRef();
  if (!ref) return null;
  try {
    const snap = await build(ref).limit(1).get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return toListing(doc.id, doc.data() as ListingDoc);
  } catch (error) {
    console.error("[listings] query failed:", error);
    return null;
  }
}

export function getListingBySlug(slug: string): Promise<Listing | null> {
  if (!slug) return Promise.resolve(null);
  return findOne((q) => q.where("slug", "==", slug));
}

/** The identity lookup: one normalized website is one listing, whatever its status. */
export function getListingByNormalizedWebsite(normalized: string): Promise<Listing | null> {
  if (!normalized) return Promise.resolve(null);
  return findOne((q) => q.where("normalizedWebsite", "==", normalized));
}

export type Ranks = { overallRank: number; categoryRank: number };

/**
 * Exact ranks for a single listing, straight from Firestore aggregations, so they stay
 * correct past `RANK_WINDOW` and immediately after a payment commits.
 */
export async function computeRanks(listing: Listing): Promise<Ranks> {
  const ref = listingsRef();
  if (!ref || listing.status !== "active") return { overallRank: 0, categoryRank: 0 };

  const reachedAt = Timestamp.fromMillis(listing.standingBidReachedAtMs);

  const higher = (q: Query) =>
    q.where("status", "==", "active").where("standingBidCents", ">", listing.standingBidCents);
  const tiedEarlier = (q: Query) =>
    q
      .where("status", "==", "active")
      .where("standingBidCents", "==", listing.standingBidCents)
      .where("standingBidReachedAt", "<", reachedAt);

  try {
    const [overallHigher, overallTied, catHigher, catTied] = await Promise.all([
      higher(ref).count().get(),
      tiedEarlier(ref).count().get(),
      higher(ref.where("category", "==", listing.category)).count().get(),
      tiedEarlier(ref.where("category", "==", listing.category)).count().get(),
    ]);

    return {
      overallRank: overallHigher.data().count + overallTied.data().count + 1,
      categoryRank: catHigher.data().count + catTied.data().count + 1,
    };
  } catch (error) {
    console.error("[listings] computeRanks failed, falling back to in-memory board:", error);
    const board = await getRankedBoard();
    const found = board.find((l) => l.id === listing.id);
    if (found) return { overallRank: found.overallRank, categoryRank: found.categoryRank };
    return { overallRank: 0, categoryRank: 0 };
  }
}

/** Ranks for a listing that is not yet in the cached board (e.g. right after a webhook). */
export async function rankOfListingId(listingId: string): Promise<Ranks | null> {
  const listing = await getListingById(listingId);
  if (!listing) return null;
  return computeRanks(listing);
}

export type CategorySummary = {
  category: CategorySlug;
  coachCount: number;
  leader: RankedListing | null;
};

export async function getCategorySummaries(
  categories: readonly CategorySlug[],
): Promise<CategorySummary[]> {
  const board = await getRankedBoard();
  return categories.map((category) => {
    const inCategory = board.filter((l) => l.category === category);
    return {
      category,
      coachCount: inCategory.length,
      leader: inCategory[0] ?? null,
    };
  });
}

export async function recordOutboundClick(
  listingId: string,
  source: ClickSource,
): Promise<void> {
  const ref = listingsRef();
  if (!ref) return;
  await ref.doc(listingId).update({
    totalClicks: FieldValue.increment(1),
    [`clicksBySource.${source}`]: FieldValue.increment(1),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

/** Admin surface: every listing, newest first, regardless of status. */
export async function listAllListings(limit = 300): Promise<Listing[]> {
  const ref = listingsRef();
  if (!ref) return [];
  try {
    const snap = await ref.orderBy("createdAt", "desc").limit(limit).get();
    return snap.docs.map((d) => toListing(d.id, d.data() as ListingDoc));
  } catch (error) {
    console.error("[listings] listAllListings failed:", error);
    return [];
  }
}

export { compareForRank };

/**
 * The highest standing bid that is not this listing's own - a coach raising their own bid
 * does not have to out-bid themselves by the #1 increment.
 */
export async function getTopStandingBidExcludingCents(listingId: string | null): Promise<number> {
  const ref = listingsRef();
  if (!ref) return 0;
  try {
    const snap = await ref
      .where("status", "==", "active")
      .orderBy("standingBidCents", "desc")
      .limit(2)
      .get();
    for (const doc of snap.docs) {
      if (doc.id === listingId) continue;
      return (doc.data() as ListingDoc).standingBidCents ?? 0;
    }
    return 0;
  } catch (error) {
    console.error("[listings] getTopStandingBidExcludingCents failed:", error);
    return 0;
  }
}
