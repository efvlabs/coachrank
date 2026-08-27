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

import { SPOTLIGHT_DURATION_MS } from "@/lib/config";
import { COLLECTIONS } from "@/lib/domain/collections";
import {
  SpotlightUnavailableError,
  processVerifiedSpotlightPayment,
  releaseSpotlightHold,
  reserveSpotlight,
} from "@/lib/domain/spotlight";
import { fakeDb } from "./fake-firestore";

const PREMIUM_CENTS = 1900;

function booking(id: string) {
  return fakeDb.peek(COLLECTIONS.spotlightBookings, id) as {
    status: string;
    startsAt: { toMillis(): number } | null;
    endsAt: { toMillis(): number } | null;
    refundRequired?: boolean;
  };
}

beforeEach(() => fakeDb.reset());

describe("spotlight reservation", () => {
  it("holds the slot so a second buyer cannot reach checkout", async () => {
    await reserveSpotlight({ slot: "premium", listingId: "l1", priceCents: PREMIUM_CENTS });

    await expect(
      reserveSpotlight({ slot: "premium", listingId: "l2", priceCents: PREMIUM_CENTS }),
    ).rejects.toBeInstanceOf(SpotlightUnavailableError);
  });

  it("keeps the two slots independent", async () => {
    await reserveSpotlight({ slot: "premium", listingId: "l1", priceCents: PREMIUM_CENTS });
    await expect(
      reserveSpotlight({ slot: "standard", listingId: "l2", priceCents: 900 }),
    ).resolves.toEqual(expect.any(String));
  });

  it("frees the slot again when checkout could not be created", async () => {
    const first = await reserveSpotlight({
      slot: "premium",
      listingId: "l1",
      priceCents: PREMIUM_CENTS,
    });
    await releaseSpotlightHold("premium", first);

    expect(booking(first).status).toBe("failed");
    await expect(
      reserveSpotlight({ slot: "premium", listingId: "l2", priceCents: PREMIUM_CENTS }),
    ).resolves.toEqual(expect.any(String));
  });
});

describe("spotlight activation", () => {
  it("runs for exactly 24 hours from the verified payment", async () => {
    const paidAt = new Date("2026-03-01T09:00:00.000Z");
    const id = await reserveSpotlight({
      slot: "premium",
      listingId: "l1",
      priceCents: PREMIUM_CENTS,
    });

    const result = await processVerifiedSpotlightPayment({
      bookingId: id,
      dodoPaymentId: "pay_spot",
      paidAt,
    });

    expect(result.outcome).toBe("activated");
    const record = booking(id);
    expect(record.status).toBe("active");
    expect(record.startsAt!.toMillis()).toBe(paidAt.getTime());
    expect(record.endsAt!.toMillis() - record.startsAt!.toMillis()).toBe(SPOTLIGHT_DURATION_MS);
    expect(record.endsAt!.toMillis() - record.startsAt!.toMillis()).toBe(24 * 60 * 60 * 1000);
  });

  it("activates once no matter how often the webhook is delivered", async () => {
    const id = await reserveSpotlight({
      slot: "premium",
      listingId: "l1",
      priceCents: PREMIUM_CENTS,
    });

    const outcomes = [];
    for (let i = 0; i < 4; i += 1) {
      outcomes.push(
        (await processVerifiedSpotlightPayment({ bookingId: id, dodoPaymentId: "pay_dup" })).outcome,
      );
    }

    expect(outcomes[0]).toBe("activated");
    expect(new Set(outcomes.slice(1))).toEqual(new Set(["already_activated"]));

    const stats = fakeDb.peek(COLLECTIONS.stats, "site") as { spotlightRevenueCents: number };
    expect(stats.spotlightRevenueCents).toBe(PREMIUM_CENTS);
  });

  it("never lets two payments own the same slot at the same time", async () => {
    const paidAt = new Date("2026-03-01T09:00:00.000Z");

    const first = await reserveSpotlight({
      slot: "premium",
      listingId: "l1",
      priceCents: PREMIUM_CENTS,
    });
    await processVerifiedSpotlightPayment({ bookingId: first, dodoPaymentId: "pay_1", paidAt });

    // A stale booking whose hold lapsed before its payment cleared.
    await fakeDb.collection(COLLECTIONS.spotlightBookings).doc("stale").set({
      listingId: "l2",
      slot: "premium",
      priceCents: PREMIUM_CENTS,
      startsAt: null,
      endsAt: null,
      totalClicks: 0,
      dodoPaymentId: null,
      dodoSessionId: null,
      status: "pending",
      createdAt: { toMillis: () => paidAt.getTime() },
    });

    const result = await processVerifiedSpotlightPayment({
      bookingId: "stale",
      dodoPaymentId: "pay_2",
      paidAt: new Date(paidAt.getTime() + 60_000),
    });

    expect(result.outcome).toBe("conflict");
    expect(booking("stale").status).toBe("failed");
    expect(booking("stale").refundRequired).toBe(true);
    expect(booking(first).status).toBe("active");

    const stats = fakeDb.peek(COLLECTIONS.stats, "site") as { spotlightRevenueCents: number };
    expect(stats.spotlightRevenueCents).toBe(PREMIUM_CENTS);
  });

  it("lets the slot be rented again once the previous booking has expired", async () => {
    const paidAt = new Date("2026-03-01T09:00:00.000Z");
    const first = await reserveSpotlight({
      slot: "premium",
      listingId: "l1",
      priceCents: PREMIUM_CENTS,
    });
    await processVerifiedSpotlightPayment({ bookingId: first, dodoPaymentId: "pay_1", paidAt });

    // Wind the slot's end time into the past, as it would be a day later.
    await fakeDb
      .collection(COLLECTIONS.spotlightSlots)
      .doc("premium")
      .update({ endsAt: { toMillis: () => Date.now() - 1000 } });

    await expect(
      reserveSpotlight({ slot: "premium", listingId: "l2", priceCents: PREMIUM_CENTS }),
    ).resolves.toEqual(expect.any(String));
  });
});
