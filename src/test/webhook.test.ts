import { beforeEach, describe, expect, it, vi } from "vitest";

const { verifyWebhook, headersRef } = vi.hoisted(() => ({
  verifyWebhook: vi.fn(),
  headersRef: { current: new Headers() },
}));

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

vi.mock("@/lib/dodo", async () => {
  const actual = await vi.importActual<typeof import("@/lib/dodo")>("@/lib/dodo");
  return { ...actual, verifyWebhook };
});

vi.mock("next/headers", () => ({
  headers: async () => headersRef.current,
}));

import { POST } from "@/app/api/webhooks/dodo/route";
import { COLLECTIONS } from "@/lib/domain/collections";
import { createPendingBidPayment, ensureListing } from "@/lib/domain/payments";
import { fakeDb } from "./fake-firestore";

const DOLLAR = 100;

function signedHeaders() {
  return new Headers({
    "webhook-id": "wh_1",
    "webhook-signature": "v1,signature",
    "webhook-timestamp": String(Math.floor(Date.now() / 1000)),
  });
}

function post(body: unknown) {
  return new Request("https://coachrank.lol/api/webhooks/dodo", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

async function seedPendingBid() {
  const { listingId } = await ensureListing({
    name: "Sarah Chen",
    normalizedWebsite: "sarahchen.com",
    displayWebsite: "https://sarahchen.com",
    category: "business",
    bio: "I help founder-led companies install predictable sales systems.",
  });
  const paymentId = await createPendingBidPayment({
    listingId,
    incrementCents: 50 * DOLLAR,
    previousStandingBidCents: 0,
    intendedStandingBidCents: 50 * DOLLAR,
  });
  return { listingId, paymentId };
}

beforeEach(() => {
  fakeDb.reset();
  verifyWebhook.mockReset();
  headersRef.current = signedHeaders();
});

describe("Dodo webhook", () => {
  it("rejects a request with missing signature headers and credits nothing", async () => {
    const { listingId } = await seedPendingBid();
    headersRef.current = new Headers();

    const response = await POST(post({}));

    expect(response.status).toBe(400);
    expect(verifyWebhook).not.toHaveBeenCalled();
    expect((fakeDb.peek(COLLECTIONS.listings, listingId) as { status: string }).status).toBe("pending");
  });

  it("rejects an invalid signature with 401 and credits nothing", async () => {
    const { listingId, paymentId } = await seedPendingBid();
    verifyWebhook.mockImplementation(() => {
      throw new Error("Invalid signature");
    });

    const response = await POST(
      post({ type: "payment.succeeded", data: { payment_id: "pay_x", metadata: {} } }),
    );

    expect(response.status).toBe(401);
    const listing = fakeDb.peek(COLLECTIONS.listings, listingId) as {
      status: string;
      standingBidCents: number;
    };
    expect(listing.status).toBe("pending");
    expect(listing.standingBidCents).toBe(0);
    expect((fakeDb.peek(COLLECTIONS.bidPayments, paymentId) as { status: string }).status).toBe(
      "pending",
    );
    expect(fakeDb.all(COLLECTIONS.activityEvents)).toHaveLength(0);
  });

  it("credits a verified payment.succeeded event", async () => {
    const { listingId, paymentId } = await seedPendingBid();
    verifyWebhook.mockReturnValue({
      type: "payment.succeeded",
      business_id: "biz",
      timestamp: new Date().toISOString(),
      data: {
        payment_id: "pay_ok",
        total_amount: 50 * DOLLAR,
        currency: "USD",
        created_at: "2026-03-01T10:00:00.000Z",
        metadata: { cr_payment_id: paymentId, cr_kind: "bid", cr_listing_id: listingId },
      },
    });

    const response = await POST(post({}));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.outcome).toBe("credited");

    const listing = fakeDb.peek(COLLECTIONS.listings, listingId) as {
      status: string;
      standingBidCents: number;
    };
    expect(listing.status).toBe("active");
    expect(listing.standingBidCents).toBe(50 * DOLLAR);
    expect(fakeDb.all(COLLECTIONS.activityEvents)).toHaveLength(1);
  });

  it("is idempotent across repeated deliveries of the same payment", async () => {
    const { listingId, paymentId } = await seedPendingBid();
    verifyWebhook.mockReturnValue({
      type: "payment.succeeded",
      business_id: "biz",
      timestamp: new Date().toISOString(),
      data: {
        payment_id: "pay_repeat",
        total_amount: 50 * DOLLAR,
        currency: "USD",
        created_at: "2026-03-01T10:00:00.000Z",
        metadata: { cr_payment_id: paymentId, cr_kind: "bid", cr_listing_id: listingId },
      },
    });

    for (let i = 0; i < 3; i += 1) await POST(post({}));

    expect(
      (fakeDb.peek(COLLECTIONS.listings, listingId) as { standingBidCents: number }).standingBidCents,
    ).toBe(50 * DOLLAR);
    expect(fakeDb.all(COLLECTIONS.activityEvents)).toHaveLength(1);
  });

  it("marks a failed payment without publishing anything", async () => {
    const { listingId, paymentId } = await seedPendingBid();
    verifyWebhook.mockReturnValue({
      type: "payment.failed",
      business_id: "biz",
      timestamp: new Date().toISOString(),
      data: {
        payment_id: "pay_fail",
        metadata: { cr_payment_id: paymentId, cr_kind: "bid", cr_listing_id: listingId },
      },
    });

    const response = await POST(post({}));

    expect(response.status).toBe(200);
    expect((fakeDb.peek(COLLECTIONS.bidPayments, paymentId) as { status: string }).status).toBe(
      "failed",
    );
    expect((fakeDb.peek(COLLECTIONS.listings, listingId) as { status: string }).status).toBe("pending");
    expect(fakeDb.all(COLLECTIONS.activityEvents)).toHaveLength(0);
  });

  it("ignores a verified event that carries no CoachRank metadata", async () => {
    verifyWebhook.mockReturnValue({
      type: "payment.succeeded",
      business_id: "biz",
      timestamp: new Date().toISOString(),
      data: { payment_id: "pay_other", metadata: {} },
    });

    const response = await POST(post({}));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.ignored).toBe("no_metadata");
    expect(fakeDb.all(COLLECTIONS.activityEvents)).toHaveLength(0);
  });
});
