import "server-only";

import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { SPOTLIGHT_DURATION_MS, SPOTLIGHT_HOLD_MS } from "../config";
import { getDb, requireDb } from "../firebase/admin";
import { COLLECTIONS, toSpotlightBooking } from "./collections";
import { getListingById } from "./listings";
import type {
  ActiveSpotlight,
  SpotlightBooking,
  SpotlightBookingDoc,
  SpotlightSlot,
} from "./types";

export const SPOTLIGHT_SLOTS: readonly SpotlightSlot[] = ["premium", "standard"] as const;

export function isSpotlightSlot(value: unknown): value is SpotlightSlot {
  return value === "premium" || value === "standard";
}

type SlotDoc = {
  activeBookingId: string | null;
  endsAt: Timestamp | null;
  holdBookingId: string | null;
  holdExpiresAt: Timestamp | null;
};

function slotRef(slot: SpotlightSlot) {
  return requireDb().collection(COLLECTIONS.spotlightSlots).doc(slot);
}

export type ReserveError = "occupied" | "held" | "listing_not_active";

export class SpotlightUnavailableError extends Error {
  constructor(
    readonly reason: ReserveError,
    readonly availableAtMs: number | null = null,
  ) {
    super(reason);
    this.name = "SpotlightUnavailableError";
  }
}

/**
 * Takes a short exclusive hold on the slot and creates a pending booking. Two buyers can
 * never both reach checkout for the same slot, so we never knowingly accept two
 * overlapping payments.
 */
export async function reserveSpotlight(args: {
  slot: SpotlightSlot;
  listingId: string;
  priceCents: number;
  /** When the buyer affirmed the Rules and Terms at checkout. */
  acceptedTermsAt?: Date;
}): Promise<string> {
  const db = requireDb();
  const now = Timestamp.now();
  const nowMs = now.toMillis();
  const bookingRef = db.collection(COLLECTIONS.spotlightBookings).doc();
  const ref = slotRef(args.slot);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const slot = (snap.data() as SlotDoc | undefined) ?? null;

    const activeUntil = slot?.endsAt?.toMillis() ?? 0;
    if (slot?.activeBookingId && activeUntil > nowMs) {
      throw new SpotlightUnavailableError("occupied", activeUntil);
    }

    const holdUntil = slot?.holdExpiresAt?.toMillis() ?? 0;
    if (slot?.holdBookingId && holdUntil > nowMs) {
      throw new SpotlightUnavailableError("held", holdUntil);
    }

    const doc: SpotlightBookingDoc = {
      listingId: args.listingId,
      slot: args.slot,
      priceCents: args.priceCents,
      acceptedTermsAt: args.acceptedTermsAt ? Timestamp.fromDate(args.acceptedTermsAt) : null,
      startsAt: null,
      endsAt: null,
      totalClicks: 0,
      dodoPaymentId: null,
      dodoSessionId: null,
      status: "pending",
      createdAt: now,
    };
    tx.create(bookingRef, doc);

    tx.set(
      ref,
      {
        activeBookingId: activeUntil > nowMs ? (slot?.activeBookingId ?? null) : null,
        endsAt: activeUntil > nowMs ? (slot?.endsAt ?? null) : null,
        holdBookingId: bookingRef.id,
        holdExpiresAt: Timestamp.fromMillis(nowMs + SPOTLIGHT_HOLD_MS),
      } satisfies SlotDoc,
      { merge: true },
    );
  });

  return bookingRef.id;
}

export async function attachSpotlightSession(bookingId: string, sessionId: string): Promise<void> {
  await requireDb()
    .collection(COLLECTIONS.spotlightBookings)
    .doc(bookingId)
    .update({ dodoSessionId: sessionId });
}

/** Drops the hold when checkout could not be created, so the slot frees up immediately. */
export async function releaseSpotlightHold(slot: SpotlightSlot, bookingId: string): Promise<void> {
  const db = getDb();
  if (!db) return;
  try {
    await db.runTransaction(async (tx) => {
      const ref = slotRef(slot);
      const snap = await tx.get(ref);
      const data = snap.data() as SlotDoc | undefined;
      if (data?.holdBookingId !== bookingId) return;
      tx.set(ref, { holdBookingId: null, holdExpiresAt: null }, { merge: true });
    });
    await db
      .collection(COLLECTIONS.spotlightBookings)
      .doc(bookingId)
      .set({ status: "failed" }, { merge: true });
  } catch (error) {
    console.error("[spotlight] releaseSpotlightHold failed:", error);
  }
}

export type ProcessSpotlightResult =
  | { outcome: "activated"; bookingId: string; endsAtMs: number }
  | { outcome: "already_activated"; bookingId: string; endsAtMs: number | null }
  | { outcome: "unknown_booking"; bookingId: string }
  | { outcome: "conflict"; bookingId: string };

/**
 * Activates a spotlight for exactly 24 hours from the verified payment.
 * Idempotent on `dodoPaymentId`.
 */
export async function processVerifiedSpotlightPayment(args: {
  bookingId: string;
  dodoPaymentId: string;
  paidAt?: Date;
}): Promise<ProcessSpotlightResult> {
  const db = requireDb();
  const startsAt = Timestamp.fromDate(args.paidAt ?? new Date());
  const startsAtMs = startsAt.toMillis();
  const endsAt = Timestamp.fromMillis(startsAtMs + SPOTLIGHT_DURATION_MS);

  const bookingRef = db.collection(COLLECTIONS.spotlightBookings).doc(args.bookingId);
  const webhookRef = db.collection(COLLECTIONS.processedWebhooks).doc(args.dodoPaymentId);
  const statsRef = db.collection(COLLECTIONS.stats).doc("site");

  return db.runTransaction<ProcessSpotlightResult>(async (tx) => {
    const [bookingSnap, webhookSnap] = await Promise.all([tx.get(bookingRef), tx.get(webhookRef)]);

    if (!bookingSnap.exists) return { outcome: "unknown_booking", bookingId: args.bookingId };
    const booking = bookingSnap.data() as SpotlightBookingDoc;

    if (webhookSnap.exists || booking.status === "active" || booking.status === "expired") {
      return {
        outcome: "already_activated",
        bookingId: args.bookingId,
        endsAtMs: booking.endsAt?.toMillis() ?? null,
      };
    }

    const ref = slotRef(booking.slot);
    const slotSnap = await tx.get(ref);
    const slot = slotSnap.data() as SlotDoc | undefined;
    const occupiedUntil = slot?.endsAt?.toMillis() ?? 0;

    // The hold lapsed and somebody else's payment landed first. We refuse to double-book
    // and flag the booking for a refund rather than overlap two paying advertisers.
    if (slot?.activeBookingId && slot.activeBookingId !== args.bookingId && occupiedUntil > startsAtMs) {
      tx.update(bookingRef, {
        status: "failed",
        refundRequired: true,
        dodoPaymentId: args.dodoPaymentId,
      });
      tx.set(webhookRef, {
        kind: "spotlight",
        bookingId: args.bookingId,
        outcome: "conflict",
        processedAt: startsAt,
      });
      return { outcome: "conflict", bookingId: args.bookingId };
    }

    tx.update(bookingRef, {
      status: "active",
      startsAt,
      endsAt,
      dodoPaymentId: args.dodoPaymentId,
    });

    tx.set(
      ref,
      {
        activeBookingId: args.bookingId,
        endsAt,
        holdBookingId: null,
        holdExpiresAt: null,
      } satisfies SlotDoc,
      { merge: true },
    );

    tx.set(webhookRef, {
      kind: "spotlight",
      bookingId: args.bookingId,
      processedAt: startsAt,
    });

    tx.set(
      statsRef,
      { spotlightRevenueCents: FieldValue.increment(booking.priceCents) },
      { merge: true },
    );

    return { outcome: "activated", bookingId: args.bookingId, endsAtMs: endsAt.toMillis() };
  });
}

async function currentBooking(slot: SpotlightSlot): Promise<SpotlightBooking | null> {
  const db = getDb();
  if (!db) return null;
  try {
    const snap = await db
      .collection(COLLECTIONS.spotlightBookings)
      .where("slot", "==", slot)
      .where("status", "==", "active")
      .where("endsAt", ">", Timestamp.now())
      .orderBy("endsAt", "desc")
      .limit(1)
      .get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return toSpotlightBooking(doc.id, doc.data() as SpotlightBookingDoc);
  } catch (error) {
    console.error("[spotlight] currentBooking failed:", error);
    return null;
  }
}

/** The occupant of a slot right now, with the coach attached - or null if it is free. */
export async function getActiveSpotlight(slot: SpotlightSlot): Promise<ActiveSpotlight | null> {
  const booking = await currentBooking(slot);
  if (!booking) return null;
  const listing = await getListingById(booking.listingId);
  if (!listing || listing.status !== "active") return null;
  return { ...booking, listing };
}

export async function getSpotlights(): Promise<Record<SpotlightSlot, ActiveSpotlight | null>> {
  const [premium, standard] = await Promise.all([
    getActiveSpotlight("premium"),
    getActiveSpotlight("standard"),
  ]);
  return { premium, standard };
}

export async function recordSpotlightClick(bookingId: string): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db
    .collection(COLLECTIONS.spotlightBookings)
    .doc(bookingId)
    .update({ totalClicks: FieldValue.increment(1) })
    .catch((error) => console.error("[spotlight] click increment failed:", error));
}

export async function recordSpotlightClickForSlot(slot: SpotlightSlot): Promise<void> {
  const booking = await currentBooking(slot);
  if (booking) await recordSpotlightClick(booking.id);
}

/** Admin surface: current and past rentals. */
export async function listSpotlightBookings(limit = 60): Promise<SpotlightBooking[]> {
  const db = getDb();
  if (!db) return [];
  try {
    const snap = await db
      .collection(COLLECTIONS.spotlightBookings)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((d) => toSpotlightBooking(d.id, d.data() as SpotlightBookingDoc));
  } catch (error) {
    console.error("[spotlight] listSpotlightBookings failed:", error);
    return [];
  }
}

export async function getSpotlightBooking(id: string): Promise<SpotlightBooking | null> {
  const db = getDb();
  if (!db || !id) return null;
  const snap = await db.collection(COLLECTIONS.spotlightBookings).doc(id).get();
  if (!snap.exists) return null;
  return toSpotlightBooking(snap.id, snap.data() as SpotlightBookingDoc);
}

export function spotlightPriceCents(
  slot: SpotlightSlot,
  pricing: { premiumSpotlightCents: number; standardSpotlightCents: number },
): number {
  return slot === "premium" ? pricing.premiumSpotlightCents : pricing.standardSpotlightCents;
}

/**
 * Frees a slot whose checkout never completed. The buyer abandoned the Dodo page or the
 * card was declined - without this the hold squats the slot until it lapses on its own.
 */
export async function abandonSpotlightBooking(bookingId: string): Promise<void> {
  const db = getDb();
  if (!db || !bookingId) return;
  try {
    const snap = await db.collection(COLLECTIONS.spotlightBookings).doc(bookingId).get();
    if (!snap.exists) return;
    const booking = snap.data() as SpotlightBookingDoc;
    // An activated Spotlight is paid for - a late failure event must not end it.
    if (booking.status !== "pending") return;
    await releaseSpotlightHold(booking.slot, bookingId);
  } catch (error) {
    console.error("[spotlight] abandonSpotlightBooking failed:", error);
  }
}

/**
 * Ends a running Spotlight whose money went back - a refund, or a lost dispute. The slot
 * frees immediately so it can be sold again rather than running out unpaid.
 */
export async function endSpotlightForPayment(args: {
  dodoPaymentId: string;
  reason: "refund" | "dispute";
  reference: string;
}): Promise<"ended" | "not_found" | "already_ended"> {
  const db = getDb();
  if (!db) return "not_found";

  const ledger = await db
    .collection(COLLECTIONS.processedWebhooks)
    .doc(args.dodoPaymentId)
    .get();
  if (!ledger.exists) return "not_found";
  const entry = ledger.data() as { kind?: string; bookingId?: string };
  if (entry.kind !== "spotlight" || !entry.bookingId) return "not_found";

  const bookingRef = db.collection(COLLECTIONS.spotlightBookings).doc(entry.bookingId);
  const snap = await bookingRef.get();
  if (!snap.exists) return "not_found";
  const booking = snap.data() as SpotlightBookingDoc;
  if (booking.status !== "active") return "already_ended";

  const now = Timestamp.now();
  await bookingRef.update({
    status: "expired",
    endsAt: now,
    reversal: { reason: args.reason, reference: args.reference, at: now },
  });

  // Clearing the slot pointer is what actually takes the ad down.
  await db
    .collection(COLLECTIONS.spotlightSlots)
    .doc(booking.slot)
    .set({ activeBookingId: null, endsAt: null, holdBookingId: null, holdExpiresAt: null }, { merge: true })
    .catch((error) => console.error("[spotlight] could not clear slot after reversal:", error));

  return "ended";
}
