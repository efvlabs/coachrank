import type { Timestamp } from "firebase-admin/firestore";
import type { CategorySlug } from "../categories";

/**
 * Awaiting payment and awaiting approval are different things, and conflating them causes
 * real damage: an approved coach who has not paid is not an abandoned checkout.
 *
 *   submitted - enrolled, waiting on us
 *   listed    - approved, in the grid, holding no rank because they paid nothing
 *   pending   - reached checkout, never paid
 *   active    - paid, on the leaderboard
 *   hidden    - taken down by moderation
 */
export type ListingStatus = "submitted" | "listed" | "pending" | "active" | "hidden";

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

  /** Set when a coach enrolled for free rather than arriving through checkout. */
  enrolledAt?: Timestamp | null;

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
  enrolled: boolean;
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

  /** When the buyer ticked the Rules and Terms box. Nothing is charged without it. */
  acceptedTermsAt: Timestamp | null;

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

/**
 * Who the ad is for. Carried on the booking itself rather than read through a listing,
 * because a Spotlight is an advertisement and does not require a rank to buy.
 */
export type SpotlightAdvertiser = {
  name: string;
  normalizedWebsite: string;
  displayWebsite: string;
  category: CategorySlug;
};

export type SpotlightBookingDoc = {
  /** Set only when the advertiser also happens to be on the board. */
  listingId: string | null;
  advertiser: SpotlightAdvertiser;
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

  /** When the buyer ticked the Rules and Terms box. Nothing is charged without it. */
  acceptedTermsAt: Timestamp | null;

  createdAt: Timestamp;
};

export type SpotlightBooking = {
  id: string;
  listingId: string | null;
  advertiser: SpotlightAdvertiser;
  slot: SpotlightSlot;
  priceCents: number;
  startsAtMs: number | null;
  endsAtMs: number | null;
  totalClicks: number;
  status: SpotlightStatus;
  createdAtMs: number;
};

/** A running Spotlight. Everything it renders comes off the booking. */
export type ActiveSpotlight = SpotlightBooking;

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
