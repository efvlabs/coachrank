"use client";

import { useEffect, useState } from "react";

import { PRESENCE_HEARTBEAT_MS } from "@/lib/config";
import type { PublicStatsSnapshot } from "@/lib/domain/types";
import { StatsPill } from "./StatsPill";

/** The shared layout persists between pages; refresh its counters independently. */
export function LiveStatsPill() {
  const [snapshot, setSnapshot] = useState<PublicStatsSnapshot | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let pending = false;

    const refresh = async () => {
      if (pending || document.visibilityState !== "visible") return;
      pending = true;
      try {
        const response = await fetch("/api/stats", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Activity unavailable");
        const data: PublicStatsSnapshot = await response.json();
        if (!controller.signal.aborted) {
          setSnapshot(data);
          setUnavailable(false);
        }
      } catch {
        if (!controller.signal.aborted) {
          setUnavailable(true);
          // Historical totals remain useful, but an old presence count is not live.
          setSnapshot((previous) => previous ? { ...previous, onlineCount: null } : null);
        }
      } finally {
        pending = false;
      }
    };

    void refresh();
    const timer = setInterval(refresh, PRESENCE_HEARTBEAT_MS);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      controller.abort();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  return (
    <div aria-label="CoachRank activity" className="flex min-h-8 w-full items-center justify-center">
      {snapshot ? <StatsPill {...snapshot} /> : (
        <p className="pill mx-auto text-ink-3" aria-busy={!unavailable}>
          {unavailable ? "Live activity unavailable" : "Loading live activity…"}
        </p>
      )}
    </div>
  );
}
