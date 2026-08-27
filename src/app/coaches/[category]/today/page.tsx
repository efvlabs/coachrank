import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BidPanel } from "@/components/BidPanel";
import { CategoryTabs } from "@/components/CategoryTabs";
import { EmptyBoard } from "@/components/EmptyBoard";
import { SpotlightRail } from "@/components/SpotlightRail";
import { StatsPill } from "@/components/StatsPill";
import { TodayBoardList } from "@/components/TodayBoardList";
import { CATEGORIES, getCategory, isCategorySlug } from "@/lib/categories";
import { requestNowMs } from "@/lib/clock";
import { isDodoConfigured } from "@/lib/dodo";
import { getRankedBoard } from "@/lib/domain/listings";
import { getPricing } from "@/lib/domain/settings";
import { getSpotlights } from "@/lib/domain/spotlight";
import { getOnlineCount, getSiteStats } from "@/lib/domain/stats";
import { getTodayBoardForCategory } from "@/lib/domain/today-board";
import { priceToClaimTopCents, topStandingBidCents } from "@/lib/ranking";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ category: c.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/coaches/[category]/today">): Promise<Metadata> {
  const { category: slug } = await params;
  const category = getCategory(slug);
  if (!category) return {};
  const title = `${category.label} coaches today`;
  return {
    title,
    description: `${category.label} coaches ranked by what they paid in the last 24 hours on CoachRank.`,
    alternates: { canonical: `/coaches/${category.slug}/today` },
  };
}

export default async function CategoryTodayPage({
  params,
}: PageProps<"/coaches/[category]/today">) {
  const { category: slug } = await params;
  if (!isCategorySlug(slug)) notFound();
  const category = getCategory(slug)!;

  const [entries, pricing, board, spotlights, stats, onlineCount] =
    await Promise.all([
      getTodayBoardForCategory(slug),
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
          pricing={pricing}
          leaderName={board[0]?.name ?? null}
          paymentsEnabled={isDodoConfigured()}
        />
      </div>

      <SpotlightRail
        spotlights={spotlights}
        pricing={pricing}
        nowMs={nowMs}
        toolbar={<CategoryTabs active={slug} board="today" />}
      >
        <header className="mb-2">
          <h1 className="display text-[clamp(1.75rem,4vw,2.5rem)] leading-none">
            {category.label} · today
          </h1>
          <p className="mt-2.5 text-[14.5px] text-ink-2">
            What {category.label.toLowerCase()} coaches paid in the last rolling
            24 hours.
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
