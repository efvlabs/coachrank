import "server-only";

import { PRICING_DEFAULTS, type Pricing } from "../config";
import { getDb } from "../firebase/admin";
import { COLLECTIONS, PRICING_DOC_ID } from "./collections";

const KEYS = Object.keys(PRICING_DEFAULTS) as (keyof Pricing)[];

/** Cached briefly so a page render does not re-read settings for every section. */
let cache: { value: Pricing; expiresAt: number } | null = null;
const TTL_MS = 15_000;

function coerce(raw: Record<string, unknown> | undefined): Pricing {
  const out = { ...PRICING_DEFAULTS } as Pricing;
  if (!raw) return out;
  for (const key of KEYS) {
    const value = raw[key];
    if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
      out[key] = value;
    }
  }
  return out;
}

export async function getPricing(): Promise<Pricing> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) return cache.value;

  const db = getDb();
  if (!db) {
    const value = { ...PRICING_DEFAULTS } as Pricing;
    cache = { value, expiresAt: now + TTL_MS };
    return value;
  }

  try {
    const snap = await db.collection(COLLECTIONS.settings).doc(PRICING_DOC_ID).get();
    const value = coerce(snap.exists ? (snap.data() as Record<string, unknown>) : undefined);
    cache = { value, expiresAt: now + TTL_MS };
    return value;
  } catch (error) {
    console.error("[settings] failed to read pricing, using defaults:", error);
    const value = { ...PRICING_DEFAULTS } as Pricing;
    cache = { value, expiresAt: now + TTL_MS };
    return value;
  }
}

export async function updatePricing(patch: Partial<Pricing>): Promise<Pricing> {
  const db = getDb();
  if (!db) throw new Error("Firebase is not configured.");

  const clean: Partial<Pricing> = {};
  for (const key of KEYS) {
    const value = patch[key];
    if (typeof value === "number" && Number.isInteger(value) && value >= 0) clean[key] = value;
  }
  if (Object.keys(clean).length === 0) return getPricing();

  await db
    .collection(COLLECTIONS.settings)
    .doc(PRICING_DOC_ID)
    .set({ ...clean, updatedAt: new Date() }, { merge: true });

  cache = null;
  return getPricing();
}

export function invalidatePricingCache(): void {
  cache = null;
}

export { KEYS as PRICING_KEYS };
