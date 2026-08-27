import type { Timestamp } from "firebase-admin/firestore";
import type { CategorySlug } from "../categories";

export type ListingStatus = "pending" | "active" | "hidden";

export type ListingDoc = {
  name: string;
  slug: string;
  normalizedWebsite: string;
  displayWebsite: string;
  category: CategorySlug;
  bio: string;

  standingBidCents: number;
  standingBidReachedAt: Timestamp;

  totalClicks: number;

  status: ListingStatus;

  createdAt: Timestamp;
  updatedAt: Timestamp;
};

/** Plain, serialisable shape handed to React components. */
export type Listing = {
  id: string;
  name: string;
  slug: string;
  normalizedWebsite: string;
  displayWebsite: string;
  category: CategorySlug;
  bio: string;
  standingBidCents: number;
  standingBidReachedAtMs: number;
  totalClicks: number;
  status: ListingStatus;
  createdAtMs: number;
  updatedAtMs: number;
};

export type RankedListing = Listing & {
  overallRank: number;
  categoryRank: number;
};

export type PaymentPurpose = "bid" | "spotlight";
export type PaymentStatus = "pending" | "paid" | "failed" | "reversed";

export type BidPaymentDoc = {
  listingId: string;

  incrementCents: number;
  previousStandingBidCents: number;
  /** What the buyer was aiming for at checkout time. Informational - bids are cumulative. */
  intendedStandingBidCents: number;
  resultingStandingBidCents: number | null;

  resultingOverallRank?: number;
  resultingCategoryRank?: number;

  dodoPaymentId: string | null;
  dodoSessionId: string | null;

  status: PaymentStatus;
  /** True when this payment first published a pending listing. */
  publishedListing: boolean;

  /** Set when a refund or a lost dispute took this payment's rank back. */
  reversal?: {
    reason: "refund" | "dispute";
    reference: string;
    cents: number;
    at: Timestamp;
  };

  createdAt: Timestamp;
  paidAt: Timestamp | null;
};

export type BidPayment = {
  id: string;
  listingId: string;
  incrementCents: number;
  previousStandingBidCents: number;
  intendedStandingBidCents: number;
  resultingStandingBidCents: number | null;
  resultingOverallRank: number | null;
  resultingCategoryRank: number | null;
  status: PaymentStatus;
  createdAtMs: number;
  paidAtMs: number | null;
};

export type ActivityEventDoc = {
  type: "bid";
  listingId: string;
  listingSlug: string;
  coachName: string;
  category: CategorySlug;
  displayWebsite: string;

  paymentIncrementCents: number;
  resultingStandingBidCents: number;

  resultingOverallRank: number;
  resultingCategoryRank: number;

  /** Cleared when the coach is hidden, so moderation reaches the tape too. */
  visible: boolean;

  createdAt: Timestamp;
};

export type ActivityEvent = {
  id: string;
  type: "bid";
  listingId: string;
  listingSlug: string;
  coachName: string;
  category: CategorySlug;
  displayWebsite: string;
  paymentIncrementCents: number;
  resultingStandingBidCents: number;
  resultingOverallRank: number;
  resultingCategoryRank: number;
  createdAtMs: number;
};

export type SpotlightSlot = "premium" | "standard";
export type SpotlightStatus = "pending" | "active" | "expired" | "failed";

export type SpotlightBookingDoc = {
  listingId: string;
  slot: SpotlightSlot;
  priceCents: number;

  startsAt: Timestamp | null;
  endsAt: Timestamp | null;

  totalClicks: number;

  dodoPaymentId: string | null;
  dodoSessionId: string | null;

  status: SpotlightStatus;
  /** Set when a payment arrived after the hold lapsed and the slot was already taken. */
  refundRequired?: boolean;

  createdAt: Timestamp;
};

export type SpotlightBooking = {
  id: string;
  listingId: string;
  slot: SpotlightSlot;
  priceCents: number;
  startsAtMs: number | null;
  endsAtMs: number | null;
  totalClicks: number;
  status: SpotlightStatus;
  createdAtMs: number;
};

export type ActiveSpotlight = SpotlightBooking & { listing: Listing };

export type BlogStatus = "draft" | "published";

export type BlogPostDoc = {
  title: string;
  slug: string;
  excerpt: string;
  markdownBody: string;
  seoTitle: string;
  metaDescription: string;
  /** Optional category slug used to pick the leaderboard CTA at the end of the article. */
  ctaCategory: CategorySlug | null;
  status: BlogStatus;
  publishedAt: Timestamp | null;
  updatedAt: Timestamp;
  createdAt: Timestamp;
};

export type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  markdownBody: string;
  seoTitle: string;
  metaDescription: string;
  ctaCategory: CategorySlug | null;
  status: BlogStatus;
  publishedAtMs: number | null;
  updatedAtMs: number;
  createdAtMs: number;
};

export type SiteStats = {
  visitors: number;
  outboundClicks: number;
  listedCoaches: number;
  leaderboardRevenueCents: number;
  spotlightRevenueCents: number;
};

export type TodayEntry = {
  listing: Listing;
  todayCents: number;
  latestPaymentAtMs: number;
};
