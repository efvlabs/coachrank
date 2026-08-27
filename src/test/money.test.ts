import { describe, expect, it } from "vitest";

import {
  centsToDollarString,
  formatCents,
  formatCentsCompact,
  parseDollarsToCents,
} from "@/lib/money";

describe("money is always integer cents", () => {
  it("parses whole and fractional dollars exactly", () => {
    expect(parseDollarsToCents("5")).toBe(500);
    expect(parseDollarsToCents("505")).toBe(50_500);
    expect(parseDollarsToCents("0.01")).toBe(1);
    expect(parseDollarsToCents("19.99")).toBe(1999);
    expect(parseDollarsToCents("$1,250")).toBe(125_000);
  });

  it("avoids floating point drift", () => {
    // 0.1 + 0.2 style errors must never reach a charge.
    expect(parseDollarsToCents("0.29")).toBe(29);
    expect(parseDollarsToCents("1.10")).toBe(110);
    expect(parseDollarsToCents("70.07")).toBe(7007);
    expect(Number.isInteger(parseDollarsToCents("8.25")!)).toBe(true);
  });

  it("rejects malformed amounts", () => {
    for (const bad of ["", "abc", "-5", "5.999", "1e3", "5.", ".5", "NaN"]) {
      expect(parseDollarsToCents(bad), bad).toBeNull();
    }
  });

  it("formats cents for display", () => {
    expect(formatCents(50_500)).toBe("$505");
    expect(formatCents(51_050)).toBe("$510.50");
    expect(formatCents(0)).toBe("$0");
    expect(formatCents(428_000)).toBe("$4,280");
  });

  it("round-trips through the input representation", () => {
    for (const cents of [500, 1999, 50_500, 51_050, 1]) {
      expect(parseDollarsToCents(centsToDollarString(cents))).toBe(cents);
    }
  });

  it("compacts large totals without lying about small ones", () => {
    expect(formatCentsCompact(428_000)).toBe("$4,280");
    expect(formatCentsCompact(1_234_500)).toBe("$12.3k");
    expect(formatCentsCompact(250_000_000)).toBe("$2.5M");
  });
});
