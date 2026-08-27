import "server-only";

import { getDb } from "../firebase/admin";
import { COLLECTIONS, toActivityEvent } from "./collections";
import type { ActivityEvent, ActivityEventDoc } from "./types";

export const ACTIVITY_PREVIEW_COUNT = 5;
export const ACTIVITY_EXPANDED_COUNT = 20;

/**
 * Latest Activity is written only by verified payment processing. Nothing seeds it,
 * nothing simulates it — if the feed is empty, nobody has paid yet.
 */
export async function getRecentActivity(limit = ACTIVITY_EXPANDED_COUNT): Promise<ActivityEvent[]> {
  const db = getDb();
  if (!db) return [];
  try {
    const snap = await db
      .collection(COLLECTIONS.activityEvents)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((d) => toActivityEvent(d.id, d.data() as ActivityEventDoc));
  } catch (error) {
    console.error("[activity] read failed:", error);
    return [];
  }
}
