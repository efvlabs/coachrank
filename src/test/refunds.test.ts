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

import { netPaidUsdCents } from "@/lib/dodo";
import { getRecentActivity } from "@/lib/domain/activity";
import { COLLECTIONS } from "@/lib/domain/collections";
import {
  createPendingBidPayment,
  ensureListing,
  processVerifiedBidPayment,
  reverseBidPayment,
  type EnsureListingInput,
} from "@/lib/domain/payments";
import { fakeDb } from "./fake-firestore";

const DOLLAR = 100;

const SARAH: EnsureListingInput = {
  name: "Sarah Chen",
  normalizedWebsite: "sarahchen.com",
  displayWebsite: "https://sarahchen.com",
  category: "business",
  bio: "",
};

async function pay(args: {
  listingId: string;
  dollars: number;
  previousDollars: number;
  dodoPaymentId: string;
  paidNetCents?: number | null;
}) {
  const paymentId = await createPendingBidPayment({
    listingId: args.listingId,
    incrementCents: args.dollars * DOLLAR,
    previousStandingBidCents: args.previousDollars * DOLLAR,
    intendedStandingBidCents: (args.previousDollars + args.dollars) * DOLLAR,
  });
  const result = await processVerifiedBidPayment({
    internalPaymentId: paymentId,
    dodoPaymentId: args.dodoPaymentId,
    paidNetCents: args.paidNetCents,
  });
  return { paymentId, result };
}

function listing(id: string) {
  return fakeDb.peek(COLLECTIONS.listings, id) as {
    standingBidCents: number;
    status: string;
  };
}

function stats() {
  return (fakeDb.peek(COLLECTIONS.stats, "site") ?? {}) as {
    leaderboardRevenueCents?: number;
    listedCoaches?: number;
  };
}

beforeEach(() => fakeDb.reset());

describe("net amount actually paid", () => {
  it("subtracts tax from a USD charge", () => {
    expect(netPaidUsdCents({ currency: "USD", total_amount: 47790, tax: 7290 })).toBe(40500);
  });

  it("handles a tax-free USD charge", () => {
    expect(netPaidUsdCents({ currency: "USD", total_amount: 51500, tax: null })).toBe(51500);
  });

  it("falls back to the USD settlement when the buyer paid in another currency", () => {
    expect(
      netPaidUsdCents({
        currency: "INR",
        total_amount: 4300000,
        tax: 650000,
        settlement_currency: "USD",
        settlement_amount: 51500,
        settlement_tax: 0,
      }),
    ).toBe(51500);
  });

  it("gives up rather than comparing across currencies", () => {
    expect(netPaidUsdCents({ currency: "INR", total_amount: 4300000, tax: 0 })).toBeNull();
  });
});

describe("crediting what actually arrived", () => {
  it("credits the amount we asked for when it matches", async () => {
    const { listingId } = await ensureListing(SARAH);
    await pay({ listingId, dollars: 515, previousDollars: 0, dodoPaymentId: "pay_1", paidNetCents: 51500 });
    expect(listing(listingId).standingBidCents).toBe(515 * DOLLAR);
  });

  it("credits only what was paid if the two ever disagree", async () => {
    const { listingId } = await ensureListing(SARAH);
    await pay({ listingId, dollars: 515, previousDollars: 0, dodoPaymentId: "pay_1", paidNetCents: 100 });
    expect(listing(listingId).standingBidCents).toBe(100);
    expect(stats().leaderboardRevenueCents).toBe(100);
  });

  it("falls back to the asked amount when the currency is not comparable", async () => {
    const { listingId } = await ensureListing(SARAH);
    await pay({ listingId, dollars: 515, previousDollars: 0, dodoPaymentId: "pay_1", paidNetCents: null });
    expect(listing(listingId).standingBidCents).toBe(515 * DOLLAR);
  });
});

describe("refunds and lost disputes take the rank back", () => {
  it("removes the increment and drops a sole-payment coach off the board", async () => {
    const { listingId } = await ensureListing(SARAH);
    await pay({ listingId, dollars: 500, previousDollars: 0, dodoPaymentId: "pay_1" });
    expect(listing(listingId).status).toBe("active");

    const result = await reverseBidPayment({
      dodoPaymentId: "pay_1",
      reason: "refund",
      reference: "ref_1",
    });

    expect(result.outcome).toBe("reversed");
    expect(listing(listingId).standingBidCents).toBe(0);
    expect(listing(listingId).status).toBe("pending");
    expect(stats().leaderboardRevenueCents).toBe(0);
    expect(stats().listedCoaches).toBe(0);
  });

  it("leaves earlier payments standing when we refund only the last one", async () => {
    const { listingId } = await ensureListing(SARAH);
    await pay({ listingId, dollars: 500, previousDollars: 0, dodoPaymentId: "pay_1" });
    await pay({ listingId, dollars: 20, previousDollars: 500, dodoPaymentId: "pay_2" });
    expect(listing(listingId).standingBidCents).toBe(520 * DOLLAR);

    await reverseBidPayment({ dodoPaymentId: "pay_2", reason: "refund", reference: "ref_1" });

    expect(listing(listingId).standingBidCents).toBe(500 * DOLLAR);
    expect(listing(listingId).status).toBe("active");
  });

  it("takes the whole listing down on a chargeback, not just the money", async () => {
    const { listingId } = await ensureListing(SARAH);
    await pay({ listingId, dollars: 500, previousDollars: 0, dodoPaymentId: "pay_1" });
    await pay({ listingId, dollars: 20, previousDollars: 500, dodoPaymentId: "pay_2" });

    // Charging back one payment is a breach of the Terms; paying for the rest does not buy
    // a way to stay on the board.
    await reverseBidPayment({ dodoPaymentId: "pay_2", reason: "dispute", reference: "dsp_1" });

    expect(listing(listingId).standingBidCents).toBe(500 * DOLLAR);
    expect(listing(listingId).status).toBe("hidden");
    expect(stats().listedCoaches).toBe(0);
    // Every trace of them leaves the tape, not just the charged-back payment.
    expect(await getRecentActivity()).toHaveLength(0);
  });

  it("counts a coach off the board only once, however they leave it", async () => {
    const { listingId } = await ensureListing(SARAH);
    await pay({ listingId, dollars: 500, previousDollars: 0, dodoPaymentId: "pay_1" });
    expect(stats().listedCoaches).toBe(1);

    await reverseBidPayment({ dodoPaymentId: "pay_1", reason: "dispute", reference: "dsp_1" });

    expect(stats().listedCoaches).toBe(0);
  });

  it("reverses exactly once however many times the event is delivered", async () => {
    const { listingId } = await ensureListing(SARAH);
    await pay({ listingId, dollars: 500, previousDollars: 0, dodoPaymentId: "pay_1" });
    await pay({ listingId, dollars: 20, previousDollars: 500, dodoPaymentId: "pay_2" });

    const first = await reverseBidPayment({ dodoPaymentId: "pay_2", reason: "refund", reference: "ref_1" });
    const second = await reverseBidPayment({ dodoPaymentId: "pay_2", reason: "refund", reference: "ref_1" });
    // A refund followed by the cardholder also winning a dispute must not double-reverse.
    const third = await reverseBidPayment({ dodoPaymentId: "pay_2", reason: "dispute", reference: "dsp_1" });

    expect(first.outcome).toBe("reversed");
    expect(second.outcome).toBe("already_reversed");
    expect(third.outcome).toBe("already_reversed");
    expect(listing(listingId).standingBidCents).toBe(500 * DOLLAR);
  });

  it("takes the reversed payment off the public tape", async () => {
    const { listingId } = await ensureListing(SARAH);
    await pay({ listingId, dollars: 500, previousDollars: 0, dodoPaymentId: "pay_1" });
    await pay({ listingId, dollars: 20, previousDollars: 500, dodoPaymentId: "pay_2" });
    expect(await getRecentActivity()).toHaveLength(2);

    await reverseBidPayment({ dodoPaymentId: "pay_2", reason: "refund", reference: "ref_1" });

    const remaining = await getRecentActivity();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].paymentIncrementCents).toBe(500 * DOLLAR);
  });

  it("never reverses a payment it did not credit in the first place", async () => {
    const result = await reverseBidPayment({
      dodoPaymentId: "pay_never_seen",
      reason: "refund",
      reference: "ref_1",
    });
    expect(result.outcome).toBe("never_credited");
  });
});
