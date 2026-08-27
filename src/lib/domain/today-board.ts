import "server-only";

import { cache } from "react";

import type { CategorySlug } from "../categories";
import { aggregateToday, todayWindowStart } from "../today";
import { getListingById } from "./listings";
import { getPaidPaymentsSince } from "./payments";
import type { TodayEntry } from "./types";

/**
 * The Today board, rebuilt from immutable payment events every time it is read.
 * Nothing is stored per-day and no payment record is ever mutated to produce it.
 */
export const getTodayBoard = cache(async (): Promise<TodayEntry[]> => {
  const nowMs = Date.now();
  const payments = await getPaidPaymentsSince(todayWindowStart(nowMs));
  if (payments.length === 0) return [];

  const totals = aggregateToday(payments, nowMs);

  const listings = await Promise.all(totals.map((t) => getListingById(t.listingId)));

  const entries: TodayEntry[] = [];
  totals.forEach((total, index) => {
    const listing = listings[index];
    // A hidden or still-pending listing does not appear on any public board.
    if (!listing || listing.status !== "active") return;
    entries.push({
      listing,
      todayCents: total.todayCents,
      latestPaymentAtMs: total.latestPaymentAtMs,
    });
  });

  return entries;
});

export async function getTodayBoardForCategory(category: CategorySlug): Promise<TodayEntry[]> {
  const board = await getTodayBoard();
  return board.filter((entry) => entry.listing.category === category);
}
