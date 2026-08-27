import { TODAY_WINDOW_MS } from "./config";

export type TodayPaymentInput = {
  listingId: string;
  incrementCents: number;
  paidAtMs: number;
};

export type TodayTotal = {
  listingId: string;
  todayCents: number;
  latestPaymentAtMs: number;
};

/**
 * Today is a rolling 24-hour window over immutable payment events. A payment contributes
 * its actual amount for exactly 24 hours after it succeeded, then silently drops out.
 * Nothing is ever mutated to make this work — All-time is untouched.
 */
export function aggregateToday(
  payments: TodayPaymentInput[],
  nowMs: number = Date.now(),
  windowMs: number = TODAY_WINDOW_MS,
): TodayTotal[] {
  const cutoff = nowMs - windowMs;
  const totals = new Map<string, TodayTotal>();

  for (const payment of payments) {
    if (payment.paidAtMs <= cutoff) continue;
    if (payment.paidAtMs > nowMs) continue;
    if (payment.incrementCents <= 0) continue;

    const existing = totals.get(payment.listingId);
    if (existing) {
      existing.todayCents += payment.incrementCents;
      existing.latestPaymentAtMs = Math.max(existing.latestPaymentAtMs, payment.paidAtMs);
    } else {
      totals.set(payment.listingId, {
        listingId: payment.listingId,
        todayCents: payment.incrementCents,
        latestPaymentAtMs: payment.paidAtMs,
      });
    }
  }

  return [...totals.values()].sort((a, b) => {
    if (a.todayCents !== b.todayCents) return b.todayCents - a.todayCents;
    // Same amount today: whoever got there first stays higher, mirroring the All-time rule.
    if (a.latestPaymentAtMs !== b.latestPaymentAtMs) return a.latestPaymentAtMs - b.latestPaymentAtMs;
    return a.listingId.localeCompare(b.listingId);
  });
}

export function todayWindowStart(nowMs: number = Date.now()): Date {
  return new Date(nowMs - TODAY_WINDOW_MS);
}
