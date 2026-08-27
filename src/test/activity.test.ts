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

import { getRecentActivity, setActivityVisibilityForListing } from "@/lib/domain/activity";
import { COLLECTIONS } from "@/lib/domain/collections";
import {
  createPendingBidPayment,
  ensureListing,
  processVerifiedBidPayment,
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

const MARCUS: EnsureListingInput = {
  name: "Marcus Bell",
  normalizedWebsite: "marcusbell.com",
  displayWebsite: "https://marcusbell.com",
  category: "career",
  bio: "",
};

/** Puts a coach on the board with one verified payment behind them. */
async function publish(coach: EnsureListingInput, dollars: number, dodoPaymentId: string) {
  const { listingId } = await ensureListing(coach);
  const paymentId = await createPendingBidPayment({
    listingId,
    incrementCents: dollars * DOLLAR,
    previousStandingBidCents: 0,
    intendedStandingBidCents: dollars * DOLLAR,
  });
  await processVerifiedBidPayment({ internalPaymentId: paymentId, dodoPaymentId });
  return listingId;
}

const names = async () => (await getRecentActivity()).map((e) => e.coachName);

beforeEach(() => fakeDb.reset());

describe("activity tape visibility", () => {
  it("publishes a visible event for a verified payment", async () => {
    await publish(SARAH, 50, "pay_1");
    expect(await names()).toEqual(["Sarah Chen"]);
  });

  it("drops a hidden coach from the tape and leaves everyone else", async () => {
    const sarah = await publish(SARAH, 50, "pay_1");
    await publish(MARCUS, 20, "pay_2");

    await setActivityVisibilityForListing(sarah, false);

    expect(await names()).toEqual(["Marcus Bell"]);
  });

  it("brings the events back when the coach is restored", async () => {
    const sarah = await publish(SARAH, 50, "pay_1");

    await setActivityVisibilityForListing(sarah, false);
    expect(await names()).toEqual([]);

    await setActivityVisibilityForListing(sarah, true);
    expect(await names()).toEqual(["Sarah Chen"]);
  });

  it("stores the flag on the event itself, so a browser query can honour it", async () => {
    const sarah = await publish(SARAH, 50, "pay_1");
    const flags = () =>
      fakeDb.all(COLLECTIONS.activityEvents).map((row) => (row.doc as { visible: boolean }).visible);

    expect(flags()).toEqual([true]);

    await setActivityVisibilityForListing(sarah, false);
    expect(flags()).toEqual([false]);
  });

  it("never writes an event for a coach who is already hidden", async () => {
    const { listingId } = await ensureListing(SARAH);
    const paymentId = await createPendingBidPayment({
      listingId,
      incrementCents: 50 * DOLLAR,
      previousStandingBidCents: 0,
      intendedStandingBidCents: 50 * DOLLAR,
    });
    await fakeDb.collection(COLLECTIONS.listings).doc(listingId).update({ status: "hidden" });

    await processVerifiedBidPayment({ internalPaymentId: paymentId, dodoPaymentId: "pay_1" });

    expect(fakeDb.all(COLLECTIONS.activityEvents)).toHaveLength(0);
  });
});
