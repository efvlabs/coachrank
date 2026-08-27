import { formatCents } from "@/lib/money";

type Props = {
  cents: number;
  /** feature = the leader and the hero; row = the price column; inline = body text. */
  size?: "hero" | "feature" | "row" | "inline";
  className?: string;
};

const SIZES = {
  hero: "text-[clamp(3.75rem,13vw,7.5rem)]",
  feature: "text-[clamp(2rem,5vw,2.75rem)]",
  row: "text-[clamp(1.25rem,3.2vw,1.6rem)]",
  inline: "text-[1.05em]",
} as const;

/**
 * Every price on the site is set in the display serif and right-aligned, so the board
 * reads as a single descending column of numbers.
 */
export function Money({ cents, size = "row", className = "" }: Props) {
  return (
    <span className={`display tnum tabular-nums ${SIZES[size]} ${className}`}>
      {formatCents(cents)}
    </span>
  );
}
