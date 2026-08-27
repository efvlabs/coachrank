"use client";

import { useEffect, useState } from "react";

const COLORS = ["#0a5c3e", "#5fcb98", "#12110f", "#8e2a1f", "#c9c3b5"];

/**
 * A single tasteful burst when someone takes #1. Reduced-motion is honoured in CSS
 * (.confetti-piece is hidden under the media query) rather than by branching in render.
 */
export function Confetti({ pieces = 44 }: { pieces?: number }) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShow(false), 4200);
    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {Array.from({ length: pieces }, (_, i) => {
        // Deterministic spread so the burst looks designed rather than noisy — and so the
        // server and client render identical markup.
        const left = ((i * 37) % 100) + (i % 3);
        const delay = (i % 11) * 0.09;
        const duration = 2.2 + ((i * 13) % 17) / 10;
        const drift = (((i * 29) % 40) - 20) * 4;
        const rotate = 360 + ((i * 53) % 540);
        return (
          <span
            key={i}
            className="confetti-piece"
            style={{
              left: `${left}%`,
              background: COLORS[i % COLORS.length],
              ["--dx" as string]: `${drift}px`,
              ["--dr" as string]: `${rotate}deg`,
              ["--dur" as string]: `${duration}s`,
              ["--delay" as string]: `${delay}s`,
            }}
          />
        );
      })}
    </div>
  );
}
