import { BidPanel } from "@/components/BidPanel";
import { CategoryTabs } from "@/components/CategoryTabs";
import { EmptyBoard } from "@/components/EmptyBoard";
import { SpotlightRail } from "@/components/SpotlightRail";
import { StatsPill } from "@/components/StatsPill";
import { TodayBoardList } from "@/components/TodayBoardList";
import { requestNowMs } from "@/lib/clock";
import { isDodoConfigured } from "@/lib/dodo";
import { getRankedBoard } from "@/lib/domain/listings";
import { getPricing } from "@/lib/domain/settings";
import { getSpotlights } from "@/lib/domain/spotlight";
import { getOnlineCount, getSiteStats } from "@/lib/domain/stats";
import { getTodayBoard } from "@/lib/domain/today-board";
import { priceToClaimTopCents, topStandingBidCents } from "@/lib/ranking";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Today",
  description:
    "Coaches ranked by what they paid in the last 24 hours. Each payment counts for exactly a day, then drops off. All-time standing is never affected.",
  alternates: { canonical: "/today" },
};

export default async function TodayPage() {
  const [entries, pricing, board, spotlights, stats, onlineCount] =
    await Promise.all([
      getTodayBoard(),
      getPricing(),
      getRankedBoard(),
      getSpotlights(),
      getSiteStats(),
      getOnlineCount(),
    ]);

  const nowMs = requestNowMs();
  const currentTopCents = topStandingBidCents(board);
  const claimTopCents = priceToClaimTopCents(currentTopCents, pricing);

  return (
    <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
      <div className="pt-7">
        <StatsPill stats={stats} onlineCount={onlineCount} />
      </div>

      <div className="pt-7 pb-12 sm:pt-8 sm:pb-14">
        <BidPanel
          claimTopCents={claimTopCents}
          currentTopCents={currentTopCents}
          leaderName={board[0]?.name ?? null}
          pricing={pricing}
          paymentsEnabled={isDodoConfigured()}
        />
      </div>

      <SpotlightRail
        spotlights={spotlights}
        pricing={pricing}
        nowMs={nowMs}
        toolbar={<CategoryTabs active="all" board="today" />}
      >
        <header className="mb-2">
          <h1 className="display text-[clamp(1.75rem,4vw,2.5rem)] leading-none">
            Today
          </h1>
          <p className="mt-2.5 text-[14.5px] text-ink-2">
            A rolling 24 hours. Each payment counts for one day, then drops off
            All-time.
          </p>
        </header>

        {entries.length === 0 ? (
          <EmptyBoard claimCents={claimTopCents} timeframe="today" />
        ) : (
          <TodayBoardList
            entries={entries}
            pricing={pricing}
            source="today"
            nowMs={nowMs}
          />
        )}
      </SpotlightRail>
    </div>
  );
}
