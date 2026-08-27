import { EmptyBoard } from "./EmptyBoard";
import { LatestActivityLazy as LatestActivity } from "./LatestActivityLazy";
import { LeaderBlock } from "./LeaderBlock";
import { LotRow } from "./LotRow";
import { Pagination } from "./Pagination";
import { TodayInsert } from "./TodayInsert";
import type { ClickSource, Pricing } from "@/lib/config";
import { priceToClaimRankCents } from "@/lib/ranking";
import type { ActivityEvent, RankedListing, TodayEntry } from "@/lib/domain/types";

type Props = {
  listings: RankedListing[];
  pricing: Pricing;
  page: number;
  pageCount: number;
  basePath: string;
  source: ClickSource;
  claimTopCents: number;
  nowMs: number;
  todayEntries?: TodayEntry[];
  todaySeeAllHref?: string;
  activity?: ActivityEvent[];
  emptyCategoryLabel?: string;
  headingLabel?: string;
};

export function claimCentsFor(listing: RankedListing, pricing: Pricing): number {
  return priceToClaimRankCents(listing.standingBidCents, listing.overallRank, pricing);
}

/**
 * The board: #1 printed as the inverse of the page, then the ledger. Ranks 2 and 3 get
 * more room, everything below is a compact line.
 */
export function BoardSections({
  listings,
  pricing,
  page,
  pageCount,
  basePath,
  source,
  claimTopCents,
  nowMs,
  todayEntries = [],
  todaySeeAllHref = "/today",
  activity = [],
  emptyCategoryLabel,
  headingLabel = "The board",
}: Props) {
  if (listings.length === 0) {
    return (
      <div id="board">
        <h2 className="sr-only">{headingLabel}</h2>
        <EmptyBoard claimCents={claimTopCents} categoryLabel={emptyCategoryLabel} />
        {activity.length > 0 ? <LatestActivity initialEvents={activity} nowMs={nowMs} /> : null}
      </div>
    );
  }

  const leader = listings[0].overallRank === 1 ? listings[0] : null;
  const rest = leader ? listings.slice(1) : listings;
  // Page 2 has no #1 on it, so the rail is drawn against whatever leads the page.
  const topBidCents = listings[0].standingBidCents;

  return (
    <div id="board">
      <h2 className="sr-only">{headingLabel}</h2>

      {leader ? (
        <LeaderBlock
          listing={leader}
          claimCents={claimCentsFor(leader, pricing)}
          source={source}
        />
      ) : null}

      {rest.length > 0 ? (
        <ol className={`space-y-2.5 ${leader ? "mt-2.5" : ""}`}>
          {rest.map((listing) => (
            <li key={listing.id}>
              <LotRow
                listing={listing}
                claimCents={claimCentsFor(listing, pricing)}
                source={source}
                podium={listing.overallRank <= 3}
                topBidCents={topBidCents}
              />
            </li>
          ))}
        </ol>
      ) : null}

      <Pagination page={page} pageCount={pageCount} basePath={basePath} />

      {page === 1 && todayEntries.length > 0 ? (
        <TodayInsert entries={todayEntries} seeAllHref={todaySeeAllHref} />
      ) : null}

      {page === 1 && activity.length > 0 ? (
        <LatestActivity initialEvents={activity} nowMs={nowMs} />
      ) : null}
    </div>
  );
}
