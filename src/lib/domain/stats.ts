import "server-only";

import { cache } from "react";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { PRESENCE_WINDOW_MS } from "../config";
import { getDb } from "../firebase/admin";
import { COLLECTIONS, STATS_DOC_ID } from "./collections";
import type { SiteStats } from "./types";

const EMPTY: SiteStats = {
  visitors: 0,
  outboundClicks: 0,
  listedCoaches: 0,
  leaderboardRevenueCents: 0,
  spotlightRevenueCents: 0,
};

function statsRef() {
  return getDb()?.collection(COLLECTIONS.stats).doc(STATS_DOC_ID) ?? null;
}

function coerce(raw: Record<string, unknown> | undefined): SiteStats {
  if (!raw) return { ...EMPTY };
  const num = (key: keyof SiteStats) => {
    const v = raw[key];
    return typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.trunc(v) : 0;
  };
  return {
    visitors: num("visitors"),
    outboundClicks: num("outboundClicks"),
    listedCoaches: num("listedCoaches"),
    leaderboardRevenueCents: num("leaderboardRevenueCents"),
    spotlightRevenueCents: num("spotlightRevenueCents"),
  };
}

export const getSiteStats = cache(async (): Promise<SiteStats> => {
  const ref = statsRef();
  if (!ref) return { ...EMPTY };
  try {
    const snap = await ref.get();
    return coerce(snap.exists ? (snap.data() as Record<string, unknown>) : undefined);
  } catch (error) {
    console.error("[stats] read failed:", error);
    return { ...EMPTY };
  }
});

/** Server-side only. Public clients can never write these counters directly. */
export async function incrementStats(patch: Partial<Record<keyof SiteStats, number>>): Promise<void> {
  const ref = statsRef();
  if (!ref) return;
  const update: Record<string, FieldValue> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (typeof value === "number" && value !== 0) update[key] = FieldValue.increment(value);
  }
  if (Object.keys(update).length === 0) return;
  await ref.set(update, { merge: true });
}

/**
 * "42 online" - a real count of heartbeats received in the last PRESENCE_WINDOW_MS.
 * Returns null when presence cannot be read, so the UI omits the figure rather than
 * printing a number that isn't true.
 */
export const getOnlineCount = cache(async (): Promise<number | null> => {
  const db = getDb();
  if (!db) return null;
  try {
    const cutoff = Timestamp.fromMillis(Date.now() - PRESENCE_WINDOW_MS);
    const snap = await db
      .collection(COLLECTIONS.presence)
      .where("lastSeen", ">", cutoff)
      .count()
      .get();
    return snap.data().count;
  } catch (error) {
    console.error("[stats] presence count failed:", error);
    return null;
  }
});

export async function recordPresenceHeartbeat(visitorId: string): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db
    .collection(COLLECTIONS.presence)
    .doc(visitorId)
    .set({ lastSeen: FieldValue.serverTimestamp() }, { merge: true });
}

/** Opportunistic cleanup so the presence collection does not grow without bound. */
export async function sweepStalePresence(limit = 50): Promise<void> {
  const db = getDb();
  if (!db) return;
  try {
    const cutoff = Timestamp.fromMillis(Date.now() - PRESENCE_WINDOW_MS * 10);
    const snap = await db
      .collection(COLLECTIONS.presence)
      .where("lastSeen", "<", cutoff)
      .limit(limit)
      .get();
    if (snap.empty) return;
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  } catch (error) {
    console.error("[stats] presence sweep failed:", error);
  }
}
