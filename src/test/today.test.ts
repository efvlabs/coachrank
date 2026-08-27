import { describe, expect, it } from "vitest";

import { TODAY_WINDOW_MS } from "@/lib/config";
import { aggregateToday } from "@/lib/today";

const NOW = 1_700_000_000_000;
const HOUR = 60 * 60 * 1000;
const DOLLAR = 100;

describe("Today rolling 24-hour window", () => {
  it("includes a payment made within the last 24 hours", () => {
    const totals = aggregateToday(
      [{ listingId: "sarah", incrementCents: 10 * DOLLAR, paidAtMs: NOW - 2 * HOUR }],
      NOW,
    );
    expect(totals).toEqual([
      { listingId: "sarah", todayCents: 10 * DOLLAR, latestPaymentAtMs: NOW - 2 * HOUR },
    ]);
  });

  it("drops a payment exactly 24 hours after it succeeded", () => {
    const payment = { listingId: "sarah", incrementCents: 10 * DOLLAR, paidAtMs: NOW - TODAY_WINDOW_MS };
    expect(aggregateToday([payment], NOW)).toEqual([]);

    // One second before the boundary it is still counted.
    const justInside = { ...payment, paidAtMs: NOW - TODAY_WINDOW_MS + 1000 };
    expect(aggregateToday([justInside], NOW)).toHaveLength(1);
  });

  it("sums every payment inside the window for one coach", () => {
    const totals = aggregateToday(
      [
        { listingId: "sarah", incrementCents: 500 * DOLLAR, paidAtMs: NOW - 20 * HOUR },
        { listingId: "sarah", incrementCents: 10 * DOLLAR, paidAtMs: NOW - 1 * HOUR },
      ],
      NOW,
    );
    expect(totals[0].todayCents).toBe(510 * DOLLAR);
  });

  it("counts only the new payment once the older one ages out", () => {
    const payments = [
      { listingId: "sarah", incrementCents: 500 * DOLLAR, paidAtMs: NOW - 30 * HOUR },
      { listingId: "sarah", incrementCents: 10 * DOLLAR, paidAtMs: NOW - 1 * HOUR },
    ];
    const totals = aggregateToday(payments, NOW);
    expect(totals).toHaveLength(1);
    expect(totals[0].todayCents).toBe(10 * DOLLAR);
  });

  it("never mutates the payment history it reads", () => {
    const payments = [
      { listingId: "sarah", incrementCents: 500 * DOLLAR, paidAtMs: NOW - 30 * HOUR },
      { listingId: "sarah", incrementCents: 10 * DOLLAR, paidAtMs: NOW - 1 * HOUR },
    ];
    const snapshot = structuredClone(payments);
    aggregateToday(payments, NOW);
    expect(payments).toEqual(snapshot);
  });

  it("ranks by today's amount, oldest first on a tie", () => {
    const totals = aggregateToday(
      [
        { listingId: "alex", incrementCents: 50 * DOLLAR, paidAtMs: NOW - 3 * HOUR },
        { listingId: "sarah", incrementCents: 75 * DOLLAR, paidAtMs: NOW - 4 * HOUR },
        { listingId: "priya", incrementCents: 50 * DOLLAR, paidAtMs: NOW - 5 * HOUR },
      ],
      NOW,
    );
    expect(totals.map((t) => t.listingId)).toEqual(["sarah", "priya", "alex"]);
  });

  it("ignores future-dated and non-positive payments", () => {
    const totals = aggregateToday(
      [
        { listingId: "a", incrementCents: 10 * DOLLAR, paidAtMs: NOW + HOUR },
        { listingId: "b", incrementCents: 0, paidAtMs: NOW - HOUR },
      ],
      NOW,
    );
    expect(totals).toEqual([]);
  });
});
