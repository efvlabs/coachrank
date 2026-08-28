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

const admin = { ok: true };
vi.mock("@/lib/admin-auth", () => ({
  requireAdmin: async () => {
    if (!admin.ok) throw new Error("not signed in");
    return { uid: "u1", email: "admin@coachrank.lol" };
  },
}));

import { deleteUnpaidListingAction } from "@/lib/domain/admin-actions";
import { COLLECTIONS } from "@/lib/domain/collections";
import {
  createPendingBidPayment,
  ensureListing,
  processVerifiedBidPayment,
  type EnsureListingInput,
} from "@/lib/domain/payments";
import { fakeDb } from "./fake-firestore";

const SARAH: EnsureListingInput = {
  name: "Sarah Chen",
  normalizedWebsite: "sarahchen.com",
  displayWebsite: "https://sarahchen.com",
  category: "business",
  bio: "",
};

function form(id: string) {
  const data = new FormData();
  data.set("id", id);
  return data;
}

const listingExists = (id: string) => Boolean(fakeDb.peek(COLLECTIONS.listings, id));

beforeEach(() => {
  fakeDb.reset();
  admin.ok = true;
});

describe("deleting a listing nobody paid for", () => {
  it("removes an abandoned checkout and the payment that never completed", async () => {
    const { listingId } = await ensureListing(SARAH);
    await createPendingBidPayment({
      listingId,
      incrementCents: 500,
      previousStandingBidCents: 0,
      intendedStandingBidCents: 500,
    });

    const result = await deleteUnpaidListingAction(form(listingId));

    expect(result.ok).toBe(true);
    expect(listingExists(listingId)).toBe(false);
    expect(fakeDb.all(COLLECTIONS.bidPayments)).toHaveLength(0);
  });

  it("refuses a listing with a verified payment behind it", async () => {
    const { listingId } = await ensureListing(SARAH);
    const paymentId = await createPendingBidPayment({
      listingId,
      incrementCents: 50_000,
      previousStandingBidCents: 0,
      intendedStandingBidCents: 50_000,
    });
    await processVerifiedBidPayment({ internalPaymentId: paymentId, dodoPaymentId: "pay_1" });

    const result = await deleteUnpaidListingAction(form(listingId));

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/money behind it/i);
    expect(listingExists(listingId)).toBe(true);
  });

  it("refuses a listing whose payment was reversed, because the money still moved", async () => {
    const { listingId } = await ensureListing(SARAH);
    const paymentId = await createPendingBidPayment({
      listingId,
      incrementCents: 50_000,
      previousStandingBidCents: 0,
      intendedStandingBidCents: 50_000,
    });
    await processVerifiedBidPayment({ internalPaymentId: paymentId, dodoPaymentId: "pay_1" });
    const { reverseBidPayment } = await import("@/lib/domain/payments");
    await reverseBidPayment({ dodoPaymentId: "pay_1", reason: "refund", reference: "ref_1" });

    const result = await deleteUnpaidListingAction(form(listingId));

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/settled payment/i);
    expect(listingExists(listingId)).toBe(true);
  });

  it("refuses anyone who is not signed in as an admin", async () => {
    const { listingId } = await ensureListing(SARAH);
    admin.ok = false;

    const result = await deleteUnpaidListingAction(form(listingId));

    expect(result.ok).toBe(false);
    expect(listingExists(listingId)).toBe(true);
  });

  it("reports a listing that is already gone rather than throwing", async () => {
    const result = await deleteUnpaidListingAction(form("does-not-exist"));
    expect(result.ok).toBe(false);
  });
});
