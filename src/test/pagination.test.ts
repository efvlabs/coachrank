import { describe, expect, it } from "vitest";

import { paginate } from "@/lib/domain/listings";
import { rankListings } from "@/lib/ranking";
import type { Listing } from "@/lib/domain/types";

function board(count: number): Listing[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `c${String(i).padStart(3, "0")}`,
    name: `Coach ${i}`,
    slug: `coach-${i}`,
    normalizedWebsite: `coach${i}.com`,
    displayWebsite: `https://coach${i}.com`,
    category: "business" as const,
    bio: "Bio.",
    standingBidCents: (count - i) * 100,
    standingBidReachedAtMs: 1000 + i,
    totalClicks: 0,
    status: "active" as const,
    enrolled: false,
    createdAtMs: 0,
    updatedAtMs: 0,
  }));
}

describe("leaderboard pagination", () => {
  it("splits into pages of 50 without dropping or repeating anyone", () => {
    const ranked = rankListings(board(120));

    const p1 = paginate(ranked, 1, 50);
    const p2 = paginate(ranked, 2, 50);
    const p3 = paginate(ranked, 3, 50);

    expect([p1.pageCount, p2.pageCount, p3.pageCount]).toEqual([3, 3, 3]);
    expect([p1.items.length, p2.items.length, p3.items.length]).toEqual([50, 50, 20]);
    expect(p1.total).toBe(120);

    const seen = [...p1.items, ...p2.items, ...p3.items].map((l) => l.id);
    expect(new Set(seen).size).toBe(120);
    expect(p1.items[0].overallRank).toBe(1);
    expect(p2.items[0].overallRank).toBe(51);
    expect(p3.items.at(-1)!.overallRank).toBe(120);
  });

  it("clamps out-of-range and malformed page numbers", () => {
    const ranked = rankListings(board(10));
    expect(paginate(ranked, 0, 50).page).toBe(1);
    expect(paginate(ranked, -3, 50).page).toBe(1);
    expect(paginate(ranked, 99, 50).page).toBe(1);
    expect(paginate(ranked, Number.NaN, 50).page).toBe(1);
  });

  it("reports a single page for an empty board rather than zero", () => {
    const empty = paginate([], 1, 50);
    expect(empty).toMatchObject({ page: 1, pageCount: 1, total: 0 });
    expect(empty.items).toEqual([]);
  });
});
