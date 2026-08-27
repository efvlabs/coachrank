import Link from "next/link";

import { BidPanel } from "@/components/BidPanel";
import { BoardSections } from "@/components/BoardSections";
import { CategoryTabs } from "@/components/CategoryTabs";
import { SpotlightRail } from "@/components/SpotlightRail";
import { StatsPill } from "@/components/StatsPill";
import { requestNowMs } from "@/lib/clock";
import { LEADERBOARD_PAGE_SIZE, SITE, absoluteUrl } from "@/lib/config";
import { isDodoConfigured } from "@/lib/dodo";
import { getRecentActivity } from "@/lib/domain/activity";
import { getRankedBoard, paginate } from "@/lib/domain/listings";
import { getPricing } from "@/lib/domain/settings";
import { getSpotlights } from "@/lib/domain/spotlight";
import { getOnlineCount, getSiteStats } from "@/lib/domain/stats";
import { getTodayBoard } from "@/lib/domain/today-board";
import { priceToClaimTopCents, topStandingBidCents } from "@/lib/ranking";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "CoachRank — the paid leaderboard for coaches",
  description: SITE.description,
  alternates: { canonical: "/" },
};

const HOW = [
  ["Cumulative", "Raise your bid and you pay only the difference."],
  [
    "Permanent",
    "Get outbid and you keep every dollar. You move down, not off.",
  ],
  ["Not a review", "We don't vet anyone. The amount is the entire ranking."],
] as const;

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const requestedPage =
    Number(Array.isArray(params.page) ? params.page[0] : params.page) || 1;
  const claimParam = Array.isArray(params.claim)
    ? params.claim[0]
    : params.claim;
  const claimCents = Number(claimParam);
  const initialAmountCents =
    Number.isInteger(claimCents) && claimCents > 0 ? claimCents : null;

  const [
    board,
    pricing,
    spotlights,
    stats,
    onlineCount,
    todayEntries,
    activity,
  ] = await Promise.all([
    getRankedBoard(),
    getPricing(),
    getSpotlights(),
    getSiteStats(),
    getOnlineCount(),
    getTodayBoard(),
    getRecentActivity(),
  ]);

  const nowMs = requestNowMs();
  const currentTopCents = topStandingBidCents(board);
  const claimTopCents = priceToClaimTopCents(currentTopCents, pricing);
  const { items, page, pageCount } = paginate(
    board,
    requestedPage,
    LEADERBOARD_PAGE_SIZE,
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "CoachRank leaderboard",
    description:
      "Coaches ranked by the total they have paid for their position.",
    numberOfItems: board.length,
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    itemListElement: board.slice(0, 20).map((l) => ({
      "@type": "ListItem",
      position: l.overallRank,
      name: l.name,
      url: absoluteUrl(`/r/${l.slug}`),
    })),
  };

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
          initialAmountCents={initialAmountCents}
        />
      </div>

      <SpotlightRail
        spotlights={spotlights}
        pricing={pricing}
        nowMs={nowMs}
        toolbar={<CategoryTabs active="all" board="all-time" />}
      >
        <BoardSections
          listings={items}
          pricing={pricing}
          page={page}
          pageCount={pageCount}
          basePath="/"
          source="leaderboard"
          claimTopCents={claimTopCents}
          nowMs={nowMs}
          todayEntries={todayEntries}
          activity={activity}
        />
      </SpotlightRail>

      <section aria-labelledby="how" className="mt-16 pt-6">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="how" className="eyebrow text-ink">
            How it works
          </h2>
          <Link href="/rules" className="buy">
            All rules →
          </Link>
        </div>
        <dl className="mt-5 grid gap-x-10 gap-y-4 sm:grid-cols-3">
          {HOW.map(([term, detail]) => (
            <div key={term}>
              <dt className="display text-[19px] leading-none">{term}</dt>
              <dd className="mt-2 text-[13.5px] leading-[1.5] text-ink-2">
                {detail}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </div>
  );
}
