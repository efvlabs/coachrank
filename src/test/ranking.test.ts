import { describe, expect, it } from "vitest";

import { PRICING_DEFAULTS, type Pricing } from "@/lib/config";
import {
  priceToClaimRankCents,
  priceToClaimTopCents,
  rankListings,
  validateTargetBid,
} from "@/lib/ranking";
import type { Listing } from "@/lib/domain/types";

const pricing: Pricing = { ...PRICING_DEFAULTS };
const DOLLAR = 100;

function listing(overrides: Partial<Listing> & { id: string }): Listing {
  return {
    name: overrides.id,
    slug: overrides.id,
    normalizedWebsite: `${overrides.id}.com`,
    displayWebsite: `https://${overrides.id}.com`,
    category: "business",
    bio: "Bio.",
    standingBidCents: 0,
    standingBidReachedAtMs: 1_000,
    totalClicks: 0,
    status: "active",
    createdAtMs: 0,
    updatedAtMs: 0,
    ...overrides,
  };
}

describe("ranking order", () => {
  it("puts the highest standing bid first", () => {
    const ranked = rankListings([
      listing({ id: "john", standingBidCents: 300 * DOLLAR }),
      listing({ id: "sarah", standingBidCents: 500 * DOLLAR }),
      listing({ id: "alex", standingBidCents: 200 * DOLLAR }),
    ]);

    expect(ranked.map((l) => l.id)).toEqual(["sarah", "john", "alex"]);
    expect(ranked.map((l) => l.overallRank)).toEqual([1, 2, 3]);
  });

  it("keeps the coach who reached the amount first higher on a tie", () => {
    const ranked = rankListings([
      listing({ id: "late", standingBidCents: 500 * DOLLAR, standingBidReachedAtMs: 2_000 }),
      listing({ id: "early", standingBidCents: 500 * DOLLAR, standingBidReachedAtMs: 1_000 }),
    ]);

    expect(ranked[0].id).toBe("early");
    expect(ranked[1].id).toBe("late");
  });

  it("excludes hidden and pending listings from the board", () => {
    const ranked = rankListings([
      listing({ id: "visible", standingBidCents: 100 * DOLLAR }),
      listing({ id: "hidden", standingBidCents: 900 * DOLLAR, status: "hidden" }),
      listing({ id: "pending", standingBidCents: 800 * DOLLAR, status: "pending" }),
    ]);

    expect(ranked).toHaveLength(1);
    expect(ranked[0].id).toBe("visible");
    expect(ranked[0].overallRank).toBe(1);
  });

  it("computes category rank from the same single bid", () => {
    const ranked = rankListings([
      listing({ id: "sarah", standingBidCents: 500 * DOLLAR, category: "business" }),
      listing({ id: "alex", standingBidCents: 400 * DOLLAR, category: "sports" }),
      listing({ id: "priya", standingBidCents: 300 * DOLLAR, category: "business" }),
    ]);

    const byId = Object.fromEntries(ranked.map((l) => [l.id, l]));
    expect(byId.sarah.overallRank).toBe(1);
    expect(byId.sarah.categoryRank).toBe(1);
    expect(byId.alex.overallRank).toBe(2);
    expect(byId.alex.categoryRank).toBe(1);
    expect(byId.priya.overallRank).toBe(3);
    expect(byId.priya.categoryRank).toBe(2);
  });

  it("pushes everyone down when a new top bid arrives, keeping their standing bids", () => {
    const before = rankListings([
      listing({ id: "sarah", standingBidCents: 500 * DOLLAR, standingBidReachedAtMs: 1 }),
      listing({ id: "john", standingBidCents: 300 * DOLLAR, standingBidReachedAtMs: 2 }),
      listing({ id: "alex", standingBidCents: 200 * DOLLAR, standingBidReachedAtMs: 3 }),
    ]);
    expect(before.map((l) => l.id)).toEqual(["sarah", "john", "alex"]);

    const after = rankListings([
      ...before,
      listing({ id: "priya", standingBidCents: 600 * DOLLAR, standingBidReachedAtMs: 4 }),
    ]);

    expect(after.map((l) => l.id)).toEqual(["priya", "sarah", "john", "alex"]);
    expect(after.find((l) => l.id === "sarah")!.standingBidCents).toBe(500 * DOLLAR);
  });
});

describe("claim prices", () => {
  it("requires $5 more than the current #1 to take the top spot", () => {
    expect(priceToClaimTopCents(500 * DOLLAR, pricing)).toBe(505 * DOLLAR);
  });

  it("costs the minimum new bid on an empty board", () => {
    expect(priceToClaimTopCents(0, pricing)).toBe(5 * DOLLAR);
  });

  it("needs one standard increment more to take any position other than #1", () => {
    expect(priceToClaimRankCents(50 * DOLLAR, 7, pricing)).toBe(
      50 * DOLLAR + pricing.standardIncrementCents,
    );
  });

  it("uses the top increment when the position being claimed is #1", () => {
    expect(priceToClaimRankCents(500 * DOLLAR, 1, pricing)).toBe(505 * DOLLAR);
  });
});

describe("bid validation", () => {
  it("accepts a new listing at the $5 minimum", () => {
    const result = validateTargetBid({
      targetStandingBidCents: 5 * DOLLAR,
      currentStandingBidCents: 0,
      currentTopCents: 0,
      pricing,
    });
    expect(result).toEqual({ ok: true, incrementCents: 5 * DOLLAR, targetStandingBidCents: 5 * DOLLAR });
  });

  it("rejects a new listing below the minimum", () => {
    const result = validateTargetBid({
      targetStandingBidCents: 4 * DOLLAR,
      currentStandingBidCents: 0,
      currentTopCents: 0,
      pricing,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("below_minimum");
  });

  it("rejects the dead zone just above #1", () => {
    const result = validateTargetBid({
      targetStandingBidCents: 502 * DOLLAR,
      currentStandingBidCents: 0,
      currentTopCents: 500 * DOLLAR,
      pricing,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("top_gap");
      if (result.error.code === "top_gap") expect(result.error.minimumCents).toBe(505 * DOLLAR);
    }
  });

  it("accepts exactly the #1 threshold", () => {
    const result = validateTargetBid({
      targetStandingBidCents: 505 * DOLLAR,
      currentStandingBidCents: 0,
      currentTopCents: 500 * DOLLAR,
      pricing,
    });
    expect(result.ok).toBe(true);
  });

  it("accepts an amount at or below #1 without needing the top increment", () => {
    const result = validateTargetBid({
      targetStandingBidCents: 51 * DOLLAR,
      currentStandingBidCents: 0,
      currentTopCents: 500 * DOLLAR,
      pricing,
    });
    expect(result).toMatchObject({ ok: true, incrementCents: 51 * DOLLAR });
  });
});

describe("cumulative delta pricing", () => {
  it("charges only the difference: $500 standing, $510 target, $10 due", () => {
    const result = validateTargetBid({
      targetStandingBidCents: 510 * DOLLAR,
      currentStandingBidCents: 500 * DOLLAR,
      currentTopCents: 505 * DOLLAR,
      topExcludingSelfCents: 505 * DOLLAR,
      pricing,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.incrementCents).toBe(10 * DOLLAR);
      expect(result.incrementCents).not.toBe(510 * DOLLAR);
      expect(result.targetStandingBidCents).toBe(510 * DOLLAR);
    }
  });

  it("charges $25 to go from $50 to $75", () => {
    const result = validateTargetBid({
      targetStandingBidCents: 75 * DOLLAR,
      currentStandingBidCents: 50 * DOLLAR,
      currentTopCents: 500 * DOLLAR,
      pricing,
    });
    expect(result).toMatchObject({ ok: true, incrementCents: 25 * DOLLAR });
  });

  it("does not make a coach out-bid themselves by the top increment", () => {
    // Sarah is #1 at $500 and raises by one standard increment. Excluding herself the
    // board tops out at $300, so the larger #1 increment must not be demanded of her.
    const raise = pricing.standardIncrementCents;
    const result = validateTargetBid({
      targetStandingBidCents: 500 * DOLLAR + raise,
      currentStandingBidCents: 500 * DOLLAR,
      currentTopCents: 500 * DOLLAR,
      topExcludingSelfCents: 300 * DOLLAR,
      pricing,
    });
    expect(result).toMatchObject({ ok: true, incrementCents: raise });
  });

  it("rejects a raise below one standard increment", () => {
    const result = validateTargetBid({
      targetStandingBidCents: 500 * DOLLAR + pricing.standardIncrementCents - 1,
      currentStandingBidCents: 500 * DOLLAR,
      currentTopCents: 500 * DOLLAR,
      topExcludingSelfCents: 0,
      pricing,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("increment_too_small");
  });

  it("rejects a target that is not an increase", () => {
    const result = validateTargetBid({
      targetStandingBidCents: 500 * DOLLAR,
      currentStandingBidCents: 500 * DOLLAR,
      currentTopCents: 500 * DOLLAR,
      topExcludingSelfCents: 0,
      pricing,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("not_an_increase");
  });

  it("rejects a raise smaller than the standard increment", () => {
    const result = validateTargetBid({
      targetStandingBidCents: 500 * DOLLAR + 50,
      currentStandingBidCents: 500 * DOLLAR,
      currentTopCents: 500 * DOLLAR,
      topExcludingSelfCents: 0,
      pricing,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("increment_too_small");
  });
});

describe("maximum bid", () => {
  it("accepts the ceiling exactly", () => {
    const result = validateTargetBid({
      targetStandingBidCents: pricing.maxBidCents,
      currentStandingBidCents: 0,
      currentTopCents: 0,
      pricing,
    });
    expect(result.ok).toBe(true);
  });

  it("rejects anything above it, so one typo cannot break the board", () => {
    const result = validateTargetBid({
      targetStandingBidCents: pricing.maxBidCents + 100,
      currentStandingBidCents: 0,
      currentTopCents: 0,
      pricing,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("above_maximum");
      if (result.error.code === "above_maximum") {
        expect(result.error.maximumCents).toBe(pricing.maxBidCents);
      }
    }
  });

  it("caps a raise from an existing listing too", () => {
    const result = validateTargetBid({
      targetStandingBidCents: pricing.maxBidCents + 500,
      currentStandingBidCents: 500 * DOLLAR,
      currentTopCents: 500 * DOLLAR,
      topExcludingSelfCents: 0,
      pricing,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("above_maximum");
  });
});
