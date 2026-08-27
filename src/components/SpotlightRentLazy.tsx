"use client";

import dynamic from "next/dynamic";

import type { SpotlightSlot } from "@/lib/domain/types";

/**
 * The rental dialog is only reachable after a click, so it is loaded on demand rather than
 * shipped with the board. The placeholder keeps the card's height identical either way.
 */
const SpotlightRent = dynamic(
  () => import("./SpotlightRent").then((m) => m.SpotlightRent),
  {
    ssr: false,
    loading: () => (
      <span
        aria-hidden="true"
        className="btn btn-primary pointer-events-none w-full px-4 py-2.5 opacity-70"
      >
        Rent this spot
      </span>
    ),
  },
);

export function SpotlightRentLazy(props: {
  slot: SpotlightSlot;
  priceCents: number;
  label: string;
}) {
  return <SpotlightRent {...props} />;
}
