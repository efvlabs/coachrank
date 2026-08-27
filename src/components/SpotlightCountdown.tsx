"use client";

import { useEffect, useState } from "react";

import { formatRemaining } from "@/lib/format";

/** Live 24-hour countdown, seeded with the server clock so hydration matches. */
export function SpotlightCountdown({ endsAtMs, nowMs }: { endsAtMs: number; nowMs: number }) {
  const [remaining, setRemaining] = useState(() => endsAtMs - nowMs);

  useEffect(() => {
    const tick = () => setRemaining(endsAtMs - Date.now());
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [endsAtMs]);

  if (remaining <= 0) return <span className="tnum">expired</span>;

  return (
    <time dateTime={new Date(endsAtMs).toISOString()} className="tnum">
      {formatRemaining(remaining)}
    </time>
  );
}
