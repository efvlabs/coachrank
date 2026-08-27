import "server-only";

import { getDb, requireDb } from "../firebase/admin";
import { COLLECTIONS, toActivityEvent } from "./collections";
import type { ActivityEvent, ActivityEventDoc } from "./types";

export const ACTIVITY_PREVIEW_COUNT = 5;
export const ACTIVITY_EXPANDED_COUNT = 20;

/**
 * Latest Activity is written only by verified payment processing. Nothing seeds it,
 * nothing simulates it - if the feed is empty, nobody has paid yet.
 */
export async function getRecentActivity(limit = ACTIVITY_EXPANDED_COUNT): Promise<ActivityEvent[]> {
  const db = getDb();
  if (!db) return [];
  try {
    const snap = await db
      .collection(COLLECTIONS.activityEvents)
      .where("visible", "==", true)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((d) => toActivityEvent(d.id, d.data() as ActivityEventDoc));
  } catch (error) {
    console.error("[activity] read failed:", error);
    return [];
  }
}

/**
 * Moderation follows the coach onto the tape. Browsers subscribe straight to Firestore,
 * so the only filter they can honour is one stored on the event itself.
 */
export async function setActivityVisibilityForListing(
  listingId: string,
  visible: boolean,
): Promise<void> {
  const db = requireDb();
  const snap = await db
    .collection(COLLECTIONS.activityEvents)
    .where("listingId", "==", listingId)
    .get();

  // Firestore caps a batch at 500 writes.
  for (let i = 0; i < snap.docs.length; i += 500) {
    const batch = db.batch();
    for (const doc of snap.docs.slice(i, i + 500)) batch.update(doc.ref, { visible });
    await batch.commit();
  }
}
