/**
 * All money in CoachRank is stored and computed as integer cents.
 * Floating point is never used for arithmetic - only for parsing user input,
 * which is immediately rounded into an integer.
 */

export const CENTS_PER_DOLLAR = 100;

/** Parse a user-entered dollar string/number into integer cents. Returns null when invalid. */
export function parseDollarsToCents(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  const raw = String(input).trim().replace(/^\$/, "").replace(/,/g, "");
  if (raw === "") return null;
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) return null;
  const [whole, frac = ""] = raw.split(".");
  const cents = Number(whole) * CENTS_PER_DOLLAR + Number((frac + "00").slice(0, 2));
  if (!Number.isSafeInteger(cents) || cents < 0) return null;
  return cents;
}

export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * CENTS_PER_DOLLAR);
}

/** `$505` for whole dollars, `$505.50` when cents are present. */
export function formatCents(cents: number): string {
  const safe = Math.max(0, Math.trunc(cents));
  const whole = Math.floor(safe / CENTS_PER_DOLLAR);
  const frac = safe % CENTS_PER_DOLLAR;
  const wholeStr = whole.toLocaleString("en-US");
  return frac === 0 ? `$${wholeStr}` : `$${wholeStr}.${String(frac).padStart(2, "0")}`;
}

/** Compact form for stat pills: $4.3k, $1.2M. Exact below 10,000. */
export function formatCentsCompact(cents: number): string {
  const dollars = Math.floor(Math.max(0, cents) / CENTS_PER_DOLLAR);
  if (dollars < 10_000) return `$${dollars.toLocaleString("en-US")}`;
  if (dollars < 1_000_000) return `$${(dollars / 1000).toFixed(dollars < 100_000 ? 1 : 0)}k`;
  return `$${(dollars / 1_000_000).toFixed(1)}M`;
}

/** Bare dollar amount without the symbol, for use inside inputs. */
export function centsToDollarString(cents: number): string {
  const safe = Math.max(0, Math.trunc(cents));
  const whole = Math.floor(safe / CENTS_PER_DOLLAR);
  const frac = safe % CENTS_PER_DOLLAR;
  return frac === 0 ? String(whole) : `${whole}.${String(frac).padStart(2, "0")}`;
}

export function formatCount(n: number): string {
  return Math.max(0, Math.trunc(n)).toLocaleString("en-US");
}
