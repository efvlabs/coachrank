import { formatCentsCompact, formatCount } from "@/lib/money";
import type { SiteStats } from "@/lib/domain/types";

type Props = { stats: SiteStats; onlineCount: number | null; className?: string };

/** Real counters only. A figure we cannot measure is dropped, never invented. */
export function StatsPill({ stats, onlineCount, className = "" }: Props) {
  const parts: React.ReactNode[] = [];

  if (onlineCount !== null && onlineCount > 0) {
    parts.push(
      <span key="online" className="inline-flex items-center gap-1.5">
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent blink" />
        <strong className="tnum font-semibold text-ink">{formatCount(onlineCount)}</strong> online
      </span>,
    );
  }
  if (stats.visitors > 0) {
    parts.push(
      <span key="v">
        <strong className="tnum font-semibold text-ink">{formatCount(stats.visitors)}</strong>{" "}
        visitors
      </span>,
    );
  }
  if (stats.outboundClicks > 0) {
    parts.push(
      <span key="c">
        <strong className="tnum font-semibold text-ink">{formatCount(stats.outboundClicks)}</strong>{" "}
        clicks sent
      </span>,
    );
  }
  if (stats.leaderboardRevenueCents > 0) {
    parts.push(
      <span key="m">
        <strong className="tnum font-semibold text-accent">
          {formatCentsCompact(stats.leaderboardRevenueCents)}
        </strong>{" "}
        on the board
      </span>,
    );
  }

  if (parts.length === 0) {
    return (
      <p className={`pill mx-auto flex w-fit max-w-full ${className}`}>
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent" />
        The board is open
      </p>
    );
  }

  return (
    <p
      className={`pill mx-auto flex w-fit max-w-full flex-wrap justify-center gap-y-1 text-[13px] ${className}`}
    >
      {parts.map((part, i) => (
        <span key={i} className="inline-flex items-center whitespace-nowrap">
          {part}
          {i < parts.length - 1 ? (
            <span aria-hidden="true" className="px-2 text-line-2">
              ·
            </span>
          ) : null}
        </span>
      ))}
    </p>
  );
}
