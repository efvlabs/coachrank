import "server-only";

import { Timestamp } from "firebase-admin/firestore";
import type {
  ActivityEvent,
  ActivityEventDoc,
  BidPayment,
  BidPaymentDoc,
  BlogPost,
  BlogPostDoc,
  Listing,
  ListingDoc,
  SpotlightBooking,
  SpotlightBookingDoc,
} from "./types";

export const COLLECTIONS = {
  listings: "listings",
  bidPayments: "bidPayments",
  activityEvents: "activityEvents",
  spotlightBookings: "spotlightBookings",
  spotlightSlots: "spotlightSlots",
  blogPosts: "blogPosts",
  stats: "stats",
  settings: "settings",
  presence: "presence",
  processedWebhooks: "processedWebhooks",
} as const;

export const STATS_DOC_ID = "site";
export const PRICING_DOC_ID = "pricing";

type WithId = { id: string };

function ms(value: Timestamp | null | undefined): number | null {
  if (!value) return null;
  return value.toMillis();
}

export function toListing(id: string, doc: ListingDoc): Listing {
  return {
    id,
    name: doc.name,
    slug: doc.slug,
    normalizedWebsite: doc.normalizedWebsite,
    displayWebsite: doc.displayWebsite,
    category: doc.category,
    bio: doc.bio,
    standingBidCents: doc.standingBidCents ?? 0,
    standingBidReachedAtMs: ms(doc.standingBidReachedAt) ?? ms(doc.createdAt) ?? 0,
    totalClicks: doc.totalClicks ?? 0,
    status: doc.status,
    createdAtMs: ms(doc.createdAt) ?? 0,
    updatedAtMs: ms(doc.updatedAt) ?? 0,
  };
}

export function toBidPayment(id: string, doc: BidPaymentDoc): BidPayment {
  return {
    id,
    listingId: doc.listingId,
    incrementCents: doc.incrementCents,
    previousStandingBidCents: doc.previousStandingBidCents,
    intendedStandingBidCents: doc.intendedStandingBidCents,
    resultingStandingBidCents: doc.resultingStandingBidCents ?? null,
    resultingOverallRank: doc.resultingOverallRank ?? null,
    resultingCategoryRank: doc.resultingCategoryRank ?? null,
    status: doc.status,
    createdAtMs: ms(doc.createdAt) ?? 0,
    paidAtMs: ms(doc.paidAt),
  };
}

export function toActivityEvent(id: string, doc: ActivityEventDoc): ActivityEvent {
  return {
    id,
    type: doc.type,
    listingId: doc.listingId,
    listingSlug: doc.listingSlug,
    coachName: doc.coachName,
    category: doc.category,
    displayWebsite: doc.displayWebsite,
    paymentIncrementCents: doc.paymentIncrementCents,
    resultingStandingBidCents: doc.resultingStandingBidCents,
    resultingOverallRank: doc.resultingOverallRank,
    resultingCategoryRank: doc.resultingCategoryRank,
    createdAtMs: ms(doc.createdAt) ?? 0,
  };
}

export function toSpotlightBooking(id: string, doc: SpotlightBookingDoc): SpotlightBooking {
  return {
    id,
    listingId: doc.listingId,
    slot: doc.slot,
    priceCents: doc.priceCents,
    startsAtMs: ms(doc.startsAt),
    endsAtMs: ms(doc.endsAt),
    totalClicks: doc.totalClicks ?? 0,
    status: doc.status,
    createdAtMs: ms(doc.createdAt) ?? 0,
  };
}

export function toBlogPost(id: string, doc: BlogPostDoc): BlogPost {
  return {
    id,
    title: doc.title,
    slug: doc.slug,
    excerpt: doc.excerpt,
    markdownBody: doc.markdownBody,
    seoTitle: doc.seoTitle || doc.title,
    metaDescription: doc.metaDescription || doc.excerpt,
    ctaCategory: doc.ctaCategory ?? null,
    status: doc.status,
    publishedAtMs: ms(doc.publishedAt),
    updatedAtMs: ms(doc.updatedAt) ?? 0,
    createdAtMs: ms(doc.createdAt) ?? 0,
  };
}

export type { WithId };
