import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("firebase-admin/firestore", async () => {
  const { FakeFieldValue, FakeTimestamp } = await import("./fake-firestore");
  return { FieldValue: FakeFieldValue, Timestamp: FakeTimestamp };
});

vi.mock("@/lib/firebase/admin", async () => {
  const { fakeDb } = await import("./fake-firestore");
  return {
    getDb: () => fakeDb,
    requireDb: () => fakeDb,
    getAdminApp: () => ({}),
    getAdminAuth: () => null,
    isFirebaseConfigured: () => true,
  };
});

import { NextRequest } from "next/server";

import { GET } from "@/app/go/[listingId]/route";
import { COLLECTIONS } from "@/lib/domain/collections";
import { fakeDb } from "./fake-firestore";

const LISTING_ID = "listing_1";

async function seedListing(status: "active" | "hidden" = "active") {
  await fakeDb.collection(COLLECTIONS.listings).doc(LISTING_ID).set({
    name: "Sarah Chen",
    slug: "sarah-chen-a1b2",
    normalizedWebsite: "sarahchen.com",
    displayWebsite: "https://sarahchen.com/coaching",
    category: "business",
    bio: "Bio.",
    standingBidCents: 50_000,
    standingBidReachedAt: { toMillis: () => 1000 },
    totalClicks: 0,
    status,
    createdAt: { toMillis: () => 1000 },
    updatedAt: { toMillis: () => 1000 },
  });
}

function request(source?: string) {
  const url = source
    ? `https://coachrank.lol/go/${LISTING_ID}?source=${source}`
    : `https://coachrank.lol/go/${LISTING_ID}`;
  return new NextRequest(new Request(url));
}

const params = Promise.resolve({ listingId: LISTING_ID });

beforeEach(() => fakeDb.reset());

describe("outbound click tracking", () => {
  it("records the click and still redirects to the coach's site", async () => {
    await seedListing();

    const response = await GET(request("leaderboard"), { params });

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://sarahchen.com/coaching");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");

    const listing = fakeDb.peek(COLLECTIONS.listings, LISTING_ID) as {
      totalClicks: number;
      clicksBySource: Record<string, number>;
    };
    expect(listing.totalClicks).toBe(1);
    expect(listing.clicksBySource.leaderboard).toBe(1);

    const stats = fakeDb.peek(COLLECTIONS.stats, "site") as { outboundClicks: number };
    expect(stats.outboundClicks).toBe(1);
  });

  it("counts each valid source separately", async () => {
    await seedListing();

    await GET(request("leaderboard"), { params });
    await GET(request("rank_page"), { params });
    await GET(request("rank_page"), { params });

    const listing = fakeDb.peek(COLLECTIONS.listings, LISTING_ID) as {
      totalClicks: number;
      clicksBySource: Record<string, number>;
    };
    expect(listing.totalClicks).toBe(3);
    expect(listing.clicksBySource).toEqual({ leaderboard: 1, rank_page: 2 });
  });

  it("falls back to the leaderboard source when the parameter is invalid", async () => {
    await seedListing();

    await GET(request("../../evil"), { params });

    const listing = fakeDb.peek(COLLECTIONS.listings, LISTING_ID) as {
      clicksBySource: Record<string, number>;
    };
    expect(listing.clicksBySource).toEqual({ leaderboard: 1 });
  });

  it("redirects home without counting anything for a hidden listing", async () => {
    await seedListing("hidden");

    const response = await GET(request("leaderboard"), { params });

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).not.toContain("sarahchen.com");
    const listing = fakeDb.peek(COLLECTIONS.listings, LISTING_ID) as { totalClicks: number };
    expect(listing.totalClicks).toBe(0);
    expect(fakeDb.peek(COLLECTIONS.stats, "site")).toBeUndefined();
  });

  it("redirects home for an unknown listing", async () => {
    const response = await GET(request("leaderboard"), { params });
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).not.toContain("sarahchen.com");
  });
});
