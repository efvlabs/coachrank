"use client";

import { CLAIM_EVENT, type ClaimEventDetail } from "@/lib/claim-event";

type Props = {
  targetCents: number;
  label: string;
  displayWebsite?: string;
  /** buy = the quiet accent link · primary = the filled pill · onDeep = on the #1 card. */
  variant?: "buy" | "primary" | "onDeep";
  className?: string;
};

/**
 * Every rank carries one of these. It prefills the form with the exact standing bid that
 * position needs and brings it into view, so the board is purchasable from any line.
 */
export function ClaimButton({
  targetCents,
  label,
  displayWebsite,
  variant = "buy",
  className = "",
}: Props) {
  function claim() {
    const detail: ClaimEventDetail = { targetCents, displayWebsite };
    window.dispatchEvent(new CustomEvent<ClaimEventDetail>(CLAIM_EVENT, { detail }));
    document.getElementById("claim")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  const styles = {
    buy: "buy",
    primary: "btn btn-primary px-6 py-2.5",
    onDeep: "btn btn-on-deep px-5 py-2.5",
  } as const;

  return (
    <button type="button" onClick={claim} className={`${styles[variant]} ${className}`}>
      {label}
    </button>
  );
}
