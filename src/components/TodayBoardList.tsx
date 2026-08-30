import Link from "next/link";

import { ClaimButton } from "./ClaimButton";
import { CoachAvatar } from "./CoachAvatar";
import { categoryLabel } from "@/lib/categories";
import type { ClickSource, Pricing } from "@/lib/config";
import { relativeTime } from "@/lib/format";
import { formatCents, formatCount } from "@/lib/money";
import { prettyWebsite } from "@/lib/url";
import type { TodayEntry } from "@/lib/domain/types";

type Props = {
  entries: TodayEntry[];
  pricing: Pricing;
  source: ClickSource;
  nowMs: number;
};

/** Today ranks the last rolling 24 hours. All-time is shown alongside so the two never blur. */
export function TodayBoardList({ entries, pricing, source, nowMs }: Props) {
  return (
    <ol id="board">
      {entries.map((entry, index) => {
        const listing = entry.listing;
        const claimCents = listing.standingBidCents + pricing.standardIncrementCents;
        return (
          <li
            key={listing.id}
            className="card mb-2.5 flex flex-wrap items-start gap-x-3 gap-y-3 px-4 py-4 sm:flex-nowrap sm:gap-x-4 sm:px-5"
          >
            <span className="tnum flex h-7 shrink-0 items-center rounded-full bg-tint px-2.5 text-[13px] font-bold text-accent">
              #{index + 1}
            </span>

            <div className="min-w-0">
              <h3 className="display flex items-baseline gap-2 text-[clamp(1.15rem,2.6vw,1.4rem)] leading-none">
                <CoachAvatar
                  name={listing.name}
                  displayWebsite={listing.displayWebsite}
                  size={18}
                  className="translate-y-[0.08em]"
                />
                <Link href={`/r/${listing.slug}`} className="hover:text-accent">
                  {listing.name}
                </Link>
              </h3>


              <ul className="meta mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <li className="tnum">All-time {formatCents(listing.standingBidCents)}</li>
                <li aria-hidden="true" className="text-line-2">·</li>
                <li>{categoryLabel(listing.category)}</li>
                <li aria-hidden="true" className="text-line-2">·</li>
                <li>
                  <a
                    href={`/go/${listing.id}?source=${source}`}
                    rel="nofollow noopener sponsored"
                    target="_blank"
                    className="inline-flex min-h-[24px] items-center text-ink-2 hover:text-ink"
                  >
                    {prettyWebsite(listing.displayWebsite)}
                  </a>
                </li>
                {listing.totalClicks > 0 ? (
                  <>
                    <li aria-hidden="true" className="text-line-2">·</li>
                    <li className="tnum">{formatCount(listing.totalClicks)} clicks</li>
                  </>
                ) : null}
                <li aria-hidden="true" className="text-line-2">·</li>
                <li>
                  <time dateTime={new Date(entry.latestPaymentAtMs).toISOString()}>
                    {relativeTime(entry.latestPaymentAtMs, nowMs)}
                  </time>
                </li>
              </ul>
            </div>

            <div className="flex w-full shrink-0 items-center justify-between gap-3 sm:w-auto sm:flex-col sm:items-end">
              <span className="display tnum text-[clamp(1.15rem,3vw,1.5rem)] text-accent">
                {formatCents(entry.todayCents)}
              </span>
              <ClaimButton targetCents={claimCents} label={`Take · ${formatCents(claimCents)}`} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
