"use client";

import dynamic from "next/dynamic";

import type { ActivityEvent } from "@/lib/domain/types";

/**
 * Below the fold, and it pulls in the Firestore listener. Loading it on demand keeps that
 * weight off the first paint of the board.
 */
const LatestActivity = dynamic(
  () => import("./LatestActivity").then((m) => m.LatestActivity),
  { ssr: false, loading: () => <div className="mt-10 h-40" aria-hidden="true" /> },
);

export function LatestActivityLazy(props: { initialEvents: ActivityEvent[]; nowMs: number }) {
  return <LatestActivity {...props} />;
}
