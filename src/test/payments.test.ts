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

import { COLLECTIONS } from "@/lib/domain/collections";
import {
  createPendingBidPayment,
  ensureListing,
  listingIdForWebsite,
  markBidPaymentFailed,
  processVerifiedBidPayment,
} from "@/lib/domain/payments";
import { fakeDb } from "./fake-firestore";

const DOLLAR = 100;

const SARAH = {
  name: "Sarah Chen",
  normalizedWebsite: "sarahchen.com",
  displayWebsite: "https://sarahchen.com",
  category: "business" as const,
  bio: "I help founder-led companies install predictable sales systems without building bloated teams.",
};

function listingDoc(id: string) {
  return fakeDb.peek(COLLECTIONS.listings, id) as
    | { standingBidCents: number; status: string; standingBidReachedAt: { toMillis(): number } }
    | undefined;
}

async function payBid(args: {
  listingId: string;
  incrementCents: number;
  previousStandingBidCents: number;
  intendedStandingBidCents: number;
  dodoPaymentId: string;
}) {
  const paymentId = await createPendingBidPayment({
    listingId: args.listingId,
    incrementCents: args.incrementCents,
    previousStandingBidCents: args.previousStandingBidCents,
    intendedStandingBidCents: args.intendedStandingBidCents,
  });
  const result = await processVerifiedBidPayment({
    internalPaymentId: paymentId,
    dodoPaymentId: args.dodoPaymentId,
  });
  return { paymentId, result };
}

beforeEach(() => fakeDb.reset());

describe("listing identity", () => {
  it("never creates two listings for the same normalized website", async () => {
    const first = await ensureListing(SARAH);
    const second = await ensureListing({
      ...SARAH,
      normalizedWebsite: "sarahchen.com",
      displayWebsite: "https://www.sarahchen.com/?utm_source=x",
      name: "Sarah C",
    });

    expect(second.listingId).toBe(first.listingId);
    expect(second.created).toBe(false);
    expect(fakeDb.all(COLLECTIONS.listings)).toHaveLength(1);
  });

  it("derives the document id deterministically from the website", async () => {
    const created = await ensureListing(SARAH);
    expect(created.listingId).toBe(listingIdForWebsite("sarahchen.com"));
  });

  it("keeps a new listing unranked until a payment is verified", async () => {
    const { listingId } = await ensureListing(SARAH);
    expect(listingDoc(listingId)!.status).toBe("pending");
    expect(listingDoc(listingId)!.standingBidCents).toBe(0);
  });
});

describe("verified payment processing", () => {
  it("publishes the listing and records the standing bid", async () => {
    const { listingId } = await ensureListing(SARAH);
    const { result } = await payBid({
      listingId,
      incrementCents: 50 * DOLLAR,
      previousStandingBidCents: 0,
      intendedStandingBidCents: 50 * DOLLAR,
      dodoPaymentId: "pay_1",
    });

    expect(result.outcome).toBe("credited");
    expect(listingDoc(listingId)!.status).toBe("active");
    expect(listingDoc(listingId)!.standingBidCents).toBe(50 * DOLLAR);
  });

  it("credits a duplicated webhook exactly once", async () => {
    const { listingId } = await ensureListing(SARAH);
    const paymentId = await createPendingBidPayment({
      listingId,
      incrementCents: 50 * DOLLAR,
      previousStandingBidCents: 0,
      intendedStandingBidCents: 50 * DOLLAR,
    });

    // Dodo retries up to eight times; five identical deliveries here.
    const outcomes = [];
    for (let i = 0; i < 5; i += 1) {
      outcomes.push(
        (await processVerifiedBidPayment({ internalPaymentId: paymentId, dodoPaymentId: "pay_dup" }))
          .outcome,
      );
    }

    expect(outcomes[0]).toBe("credited");
    expect(outcomes.slice(1)).toEqual([
      "already_credited",
      "already_credited",
      "already_credited",
      "already_credited",
    ]);
    expect(listingDoc(listingId)!.standingBidCents).toBe(50 * DOLLAR);
    expect(fakeDb.all(COLLECTIONS.activityEvents)).toHaveLength(1);
  });

  it("charges only the difference on a re-bid and never the full target again", async () => {
    const { listingId } = await ensureListing(SARAH);

    await payBid({
      listingId,
      incrementCents: 500 * DOLLAR,
      previousStandingBidCents: 0,
      intendedStandingBidCents: 500 * DOLLAR,
      dodoPaymentId: "pay_500",
    });
    expect(listingDoc(listingId)!.standingBidCents).toBe(500 * DOLLAR);

    // Target $510 from a $500 standing bid: the charge is $10.
    const { paymentId } = await payBid({
      listingId,
      incrementCents: 10 * DOLLAR,
      previousStandingBidCents: 500 * DOLLAR,
      intendedStandingBidCents: 510 * DOLLAR,
      dodoPaymentId: "pay_510",
    });

    expect(listingDoc(listingId)!.standingBidCents).toBe(510 * DOLLAR);

    const payment = fakeDb.peek(COLLECTIONS.bidPayments, paymentId) as {
      incrementCents: number;
      resultingStandingBidCents: number;
    };
    expect(payment.incrementCents).toBe(10 * DOLLAR);
    expect(payment.incrementCents).not.toBe(510 * DOLLAR);
    expect(payment.resultingStandingBidCents).toBe(510 * DOLLAR);

    const stats = fakeDb.peek(COLLECTIONS.stats, "site") as { leaderboardRevenueCents: number };
    expect(stats.leaderboardRevenueCents).toBe(510 * DOLLAR);
  });

  it("adds increments cumulatively when two checkouts complete out of order", async () => {
    const { listingId } = await ensureListing(SARAH);
    await payBid({
      listingId,
      incrementCents: 500 * DOLLAR,
      previousStandingBidCents: 0,
      intendedStandingBidCents: 500 * DOLLAR,
      dodoPaymentId: "pay_a",
    });

    // Two racing top-ups, both quoted against the same $500 snapshot.
    const first = await createPendingBidPayment({
      listingId,
      incrementCents: 10 * DOLLAR,
      previousStandingBidCents: 500 * DOLLAR,
      intendedStandingBidCents: 510 * DOLLAR,
    });
    const second = await createPendingBidPayment({
      listingId,
      incrementCents: 20 * DOLLAR,
      previousStandingBidCents: 500 * DOLLAR,
      intendedStandingBidCents: 520 * DOLLAR,
    });

    await processVerifiedBidPayment({ internalPaymentId: second, dodoPaymentId: "pay_c" });
    await processVerifiedBidPayment({ internalPaymentId: first, dodoPaymentId: "pay_b" });

    // Money is applied as an increment, never an assignment: $500 + $20 + $10.
    expect(listingDoc(listingId)!.standingBidCents).toBe(530 * DOLLAR);
  });

  it("advances standingBidReachedAt so the tie-break reflects the newest raise", async () => {
    const { listingId } = await ensureListing(SARAH);
    const early = new Date("2026-01-01T00:00:00Z");
    const later = new Date("2026-01-02T00:00:00Z");

    let paymentId = await createPendingBidPayment({
      listingId,
      incrementCents: 50 * DOLLAR,
      previousStandingBidCents: 0,
      intendedStandingBidCents: 50 * DOLLAR,
    });
    await processVerifiedBidPayment({
      internalPaymentId: paymentId,
      dodoPaymentId: "pay_early",
      paidAt: early,
    });
    expect(listingDoc(listingId)!.standingBidReachedAt.toMillis()).toBe(early.getTime());

    paymentId = await createPendingBidPayment({
      listingId,
      incrementCents: 25 * DOLLAR,
      previousStandingBidCents: 50 * DOLLAR,
      intendedStandingBidCents: 75 * DOLLAR,
    });
    await processVerifiedBidPayment({
      internalPaymentId: paymentId,
      dodoPaymentId: "pay_later",
      paidAt: later,
    });
    expect(listingDoc(listingId)!.standingBidReachedAt.toMillis()).toBe(later.getTime());
  });

  it("does not publish a listing that moderation has hidden", async () => {
    const { listingId } = await ensureListing(SARAH);
    await fakeDb.collection(COLLECTIONS.listings).doc(listingId).update({ status: "hidden" });

    await payBid({
      listingId,
      incrementCents: 50 * DOLLAR,
      previousStandingBidCents: 0,
      intendedStandingBidCents: 50 * DOLLAR,
      dodoPaymentId: "pay_hidden",
    });

    expect(listingDoc(listingId)!.status).toBe("hidden");
    expect(listingDoc(listingId)!.standingBidCents).toBe(50 * DOLLAR);
    expect(fakeDb.all(COLLECTIONS.activityEvents)).toHaveLength(0);
  });
});

describe("latest activity", () => {
  it("creates exactly one event for a successful payment", async () => {
    const { listingId } = await ensureListing(SARAH);
    const { paymentId } = await payBid({
      listingId,
      incrementCents: 85 * DOLLAR,
      previousStandingBidCents: 0,
      intendedStandingBidCents: 85 * DOLLAR,
      dodoPaymentId: "pay_activity",
    });

    const events = fakeDb.all(COLLECTIONS.activityEvents);
    expect(events).toHaveLength(1);
    expect(events[0].id).toBe(paymentId);
    expect(events[0].doc).toMatchObject({
      type: "bid",
      coachName: "Sarah Chen",
      paymentIncrementCents: 85 * DOLLAR,
      resultingStandingBidCents: 85 * DOLLAR,
      resultingOverallRank: 1,
      resultingCategoryRank: 1,
    });
  });

  it("creates no event for a failed payment", async () => {
    const { listingId } = await ensureListing(SARAH);
    const paymentId = await createPendingBidPayment({
      listingId,
      incrementCents: 50 * DOLLAR,
      previousStandingBidCents: 0,
      intendedStandingBidCents: 50 * DOLLAR,
    });

    await markBidPaymentFailed(paymentId);

    expect(fakeDb.all(COLLECTIONS.activityEvents)).toHaveLength(0);
    expect(listingDoc(listingId)!.status).toBe("pending");
    expect(listingDoc(listingId)!.standingBidCents).toBe(0);
  });

  it("ranks a second coach correctly in the event it publishes", async () => {
    const sarah = await ensureListing(SARAH);
    await payBid({
      listingId: sarah.listingId,
      incrementCents: 500 * DOLLAR,
      previousStandingBidCents: 0,
      intendedStandingBidCents: 500 * DOLLAR,
      dodoPaymentId: "pay_sarah",
    });

    const alex = await ensureListing({
      ...SARAH,
      name: "Alex Moore",
      normalizedWebsite: "alexmoore.com",
      displayWebsite: "https://alexmoore.com",
      category: "sports",
    });
    const { paymentId } = await payBid({
      listingId: alex.listingId,
      incrementCents: 120 * DOLLAR,
      previousStandingBidCents: 0,
      intendedStandingBidCents: 120 * DOLLAR,
      dodoPaymentId: "pay_alex",
    });

    const event = fakeDb.peek(COLLECTIONS.activityEvents, paymentId) as {
      resultingOverallRank: number;
      resultingCategoryRank: number;
    };
    expect(event.resultingOverallRank).toBe(2);
    expect(event.resultingCategoryRank).toBe(1);
  });
});

describe("stats", () => {
  it("counts a coach as listed only when their first payment publishes them", async () => {
    const { listingId } = await ensureListing(SARAH);
    expect(fakeDb.peek(COLLECTIONS.stats, "site")).toBeUndefined();

    await payBid({
      listingId,
      incrementCents: 50 * DOLLAR,
      previousStandingBidCents: 0,
      intendedStandingBidCents: 50 * DOLLAR,
      dodoPaymentId: "pay_first",
    });
    expect((fakeDb.peek(COLLECTIONS.stats, "site") as { listedCoaches: number }).listedCoaches).toBe(1);

    await payBid({
      listingId,
      incrementCents: 10 * DOLLAR,
      previousStandingBidCents: 50 * DOLLAR,
      intendedStandingBidCents: 60 * DOLLAR,
      dodoPaymentId: "pay_second",
    });
    expect((fakeDb.peek(COLLECTIONS.stats, "site") as { listedCoaches: number }).listedCoaches).toBe(1);
  });
});
