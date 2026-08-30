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

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("@/lib/admin-auth", () => ({
  requireAdmin: async () => ({ uid: "u1", email: "admin@coachrank.lol" }),
}));

import { addCoachAction, decideEnrolmentAction } from "@/lib/domain/admin-actions";
import { COLLECTIONS } from "@/lib/domain/collections";
import {
  createPendingBidPayment,
  processVerifiedBidPayment,
  reverseBidPayment,
} from "@/lib/domain/payments";
import { fakeDb } from "./fake-firestore";
import type { ListingStatus } from "@/lib/domain/types";

function form(entries: Record<string, string>) {
  const data = new FormData();
  for (const [k, v] of Object.entries(entries)) data.set(k, v);
  return data;
}

function statusOf(id: string): ListingStatus {
  return (fakeDb.peek(COLLECTIONS.listings, id) as { status: ListingStatus }).status;
}

function onlyListing() {
  const rows = fakeDb.all(COLLECTIONS.listings);
  return { id: rows[0].id, doc: rows[0].doc as Record<string, unknown> };
}

async function addCoach(name = "Tony Robbins", website = "tonyrobbins.com") {
  const result = await addCoachAction(form({ name, website, category: "business" }));
  return { result, ...onlyListing() };
}

beforeEach(() => fakeDb.reset());

describe("a coach who was added rather than charged", () => {
  it("lands in the grid, holding no rank", async () => {
    const { result, id, doc } = await addCoach();

    expect(result.ok).toBe(true);
    expect(statusOf(id)).toBe("listed");
    expect(doc.standingBidCents).toBe(0);
    expect(doc.enrolledAt).toBeTruthy();
  });

  it("refuses a website that is already on the site", async () => {
    await addCoach();
    const again = await addCoachAction(
      form({ name: "Someone Else", website: "https://www.tonyrobbins.com/", category: "career" }),
    );
    expect(again.ok).toBe(false);
    expect(fakeDb.all(COLLECTIONS.listings)).toHaveLength(1);
  });

  it("screens the website the same way the paid flow does", async () => {
    const result = await addCoachAction(
      form({ name: "Tony Robbins", website: "https://bit.ly/x", category: "business" }),
    );
    expect(result.ok).toBe(false);
    expect(fakeDb.all(COLLECTIONS.listings)).toHaveLength(0);
  });

  it("crosses onto the board the moment they pay, with no flag to flip", async () => {
    const { id } = await addCoach();

    const paymentId = await createPendingBidPayment({
      listingId: id,
      incrementCents: 500,
      previousStandingBidCents: 0,
      intendedStandingBidCents: 500,
    });
    await processVerifiedBidPayment({ internalPaymentId: paymentId, dodoPaymentId: "pay_1" });

    expect(statusOf(id)).toBe("active");
    expect((fakeDb.peek(COLLECTIONS.listings, id) as { standingBidCents: number }).standingBidCents)
      .toBe(500);
  });

  it("returns to the grid, not to pending, when a refund empties their bid", async () => {
    const { id } = await addCoach();
    const paymentId = await createPendingBidPayment({
      listingId: id,
      incrementCents: 500,
      previousStandingBidCents: 0,
      intendedStandingBidCents: 500,
    });
    await processVerifiedBidPayment({ internalPaymentId: paymentId, dodoPaymentId: "pay_1" });

    await reverseBidPayment({ dodoPaymentId: "pay_1", reason: "refund", reference: "ref_1" });

    // They paid nothing again - but they were never an abandoned checkout.
    expect(statusOf(id)).toBe("listed");
  });
});

describe("deciding an enrolment", () => {
  async function submitted() {
    const { id } = await addCoach();
    await fakeDb.collection(COLLECTIONS.listings).doc(id).update({ status: "submitted" });
    return id;
  }

  it("approving puts them in the grid", async () => {
    const id = await submitted();
    const result = await decideEnrolmentAction(form({ id, decision: "approve" }));

    expect(result.ok).toBe(true);
    expect(statusOf(id)).toBe("listed");
  });

  it("declining hides the record rather than deleting it", async () => {
    const id = await submitted();
    const result = await decideEnrolmentAction(form({ id, decision: "decline" }));

    expect(result.ok).toBe(true);
    expect(statusOf(id)).toBe("hidden");
    // Kept, so the same website cannot quietly re-apply on a loop.
    expect(fakeDb.all(COLLECTIONS.listings)).toHaveLength(1);
  });

  it("cannot decide the same enrolment twice", async () => {
    const id = await submitted();
    await decideEnrolmentAction(form({ id, decision: "approve" }));
    const again = await decideEnrolmentAction(form({ id, decision: "decline" }));

    expect(again.ok).toBe(false);
    expect(statusOf(id)).toBe("listed");
  });
});
