import type { Pricing } from "./config";

/** Ranking only needs the three bidding knobs, not the Spotlight prices. */
export type RankingPricing = Pick<
  Pricing,
  "minNewBidCents" | "topPositionIncrementCents" | "standardIncrementCents" | "maxBidCents"
>;
import type { Listing, RankedListing } from "./domain/types";

/**
 * The single ordering rule for the whole product:
 *   1. higher standing bid ranks higher
 *   2. on a tie, whoever reached that amount first stays higher
 */
export function compareForRank(
  a: Pick<Listing, "standingBidCents" | "standingBidReachedAtMs" | "id">,
  b: Pick<Listing, "standingBidCents" | "standingBidReachedAtMs" | "id">,
): number {
  if (a.standingBidCents !== b.standingBidCents) return b.standingBidCents - a.standingBidCents;
  if (a.standingBidReachedAtMs !== b.standingBidReachedAtMs) {
    return a.standingBidReachedAtMs - b.standingBidReachedAtMs;
  }
  // Deterministic final tiebreak so ranks never flicker between renders.
  return a.id.localeCompare(b.id);
}

export function isRankable(listing: Listing): boolean {
  return listing.status === "active";
}

/** Sorts active listings and stamps both the overall and the within-category rank. */
export function rankListings(listings: Listing[]): RankedListing[] {
  const active = listings.filter(isRankable).slice().sort(compareForRank);
  const categoryCounters = new Map<string, number>();

  return active.map((listing, index) => {
    const nextCategoryRank = (categoryCounters.get(listing.category) ?? 0) + 1;
    categoryCounters.set(listing.category, nextCategoryRank);
    return { ...listing, overallRank: index + 1, categoryRank: nextCategoryRank };
  });
}

export function topStandingBidCents(ranked: Pick<Listing, "standingBidCents">[]): number {
  return ranked.length > 0 ? ranked[0].standingBidCents : 0;
}

/**
 * What a challenger must have as their *standing bid* to take #1.
 * On an empty board, #1 simply costs the minimum new bid.
 */
export function priceToClaimTopCents(currentTopCents: number, pricing: RankingPricing): number {
  if (currentTopCents <= 0) return pricing.minNewBidCents;
  return currentTopCents + pricing.topPositionIncrementCents;
}

/**
 * What a challenger must have as their standing bid to take the position currently held
 * by a listing sitting at `occupantBidCents`. Position 1 uses the larger increment.
 */
export function priceToClaimRankCents(
  occupantBidCents: number,
  occupantRank: number,
  pricing: RankingPricing,
): number {
  if (occupantRank <= 1) return priceToClaimTopCents(occupantBidCents, pricing);
  return Math.max(occupantBidCents + pricing.standardIncrementCents, pricing.minNewBidCents);
}

export type BidValidationError =
  | { code: "below_minimum"; minimumCents: number }
  | { code: "above_maximum"; maximumCents: number }
  | { code: "not_an_increase"; currentCents: number }
  | { code: "increment_too_small"; minimumIncrementCents: number }
  | { code: "top_gap"; minimumCents: number; currentTopCents: number }
  | { code: "invalid_amount" };

export type BidValidationResult =
  | { ok: true; incrementCents: number; targetStandingBidCents: number }
  | { ok: false; error: BidValidationError };

/**
 * Validates a target standing bid for either a brand-new listing (`currentStandingBidCents: 0`)
 * or an existing one, and returns the amount we will actually charge.
 *
 * Because bids are cumulative, an existing coach pays only the difference between their
 * current standing bid and the target.
 */
export function validateTargetBid(args: {
  targetStandingBidCents: number;
  currentStandingBidCents: number;
  currentTopCents: number;
  /** The top bid excluding this listing — a coach does not have to out-bid themselves by $5. */
  topExcludingSelfCents?: number;
  pricing: RankingPricing;
}): BidValidationResult {
  const { targetStandingBidCents: target, currentStandingBidCents: current, pricing } = args;
  const topExcludingSelf = args.topExcludingSelfCents ?? args.currentTopCents;

  if (!Number.isInteger(target) || target <= 0) {
    return { ok: false, error: { code: "invalid_amount" } };
  }

  if (target < pricing.minNewBidCents) {
    return { ok: false, error: { code: "below_minimum", minimumCents: pricing.minNewBidCents } };
  }

  // A ceiling keeps a typo or a stunt from making the board unusable for everyone else.
  if (pricing.maxBidCents > 0 && target > pricing.maxBidCents) {
    return { ok: false, error: { code: "above_maximum", maximumCents: pricing.maxBidCents } };
  }

  if (current > 0 && target <= current) {
    return { ok: false, error: { code: "not_an_increase", currentCents: current } };
  }

  const incrementCents = target - current;

  if (current > 0 && incrementCents < pricing.standardIncrementCents) {
    return {
      ok: false,
      error: { code: "increment_too_small", minimumIncrementCents: pricing.standardIncrementCents },
    };
  }

  // The dead zone: above the current #1 but not far enough above to actually take #1.
  if (topExcludingSelf > 0 && target > topExcludingSelf) {
    const required = topExcludingSelf + pricing.topPositionIncrementCents;
    if (target < required) {
      return {
        ok: false,
        error: { code: "top_gap", minimumCents: required, currentTopCents: topExcludingSelf },
      };
    }
  }

  return { ok: true, incrementCents, targetStandingBidCents: target };
}

export function bidValidationMessage(error: BidValidationError, fmt: (c: number) => string): string {
  switch (error.code) {
    case "below_minimum":
      return `New listings start at ${fmt(error.minimumCents)}.`;
    case "above_maximum":
      return `${fmt(error.maximumCents)} is the highest standing bid the board takes.`;
    case "not_an_increase":
      return `Your standing bid is already ${fmt(error.currentCents)}. Pick a higher number.`;
    case "increment_too_small":
      return `Raise your standing bid by at least ${fmt(error.minimumIncrementCents)}.`;
    case "top_gap":
      return `#1 is at ${fmt(error.currentTopCents)}. To pass it, go to ${fmt(error.minimumCents)} or more — or pick any amount at or below ${fmt(error.currentTopCents)}.`;
    case "invalid_amount":
      return "Enter a valid amount.";
  }
}
