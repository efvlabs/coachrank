import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BidPanel } from "@/components/BidPanel";
import { BoardSections } from "@/components/BoardSections";
import { CategoryTabs } from "@/components/CategoryTabs";
import { SpotlightRail } from "@/components/SpotlightRail";
import { StatsPill } from "@/components/StatsPill";
import { CATEGORIES, getCategory, isCategorySlug } from "@/lib/categories";
import { LEADERBOARD_PAGE_SIZE, SITE, absoluteUrl } from "@/lib/config";
import { requestNowMs } from "@/lib/clock";
import { isDodoConfigured } from "@/lib/dodo";
import { getRecentActivity } from "@/lib/domain/activity";
import { CoachGrid } from "@/components/CoachGrid";
import { getListedCoaches, getRankedBoard, paginate } from "@/lib/domain/listings";
import { getPricing } from "@/lib/domain/settings";
import { getSpotlights } from "@/lib/domain/spotlight";
import { getOnlineCount, getSiteStats } from "@/lib/domain/stats";
import { getTodayBoardForCategory } from "@/lib/domain/today-board";
import { formatCents } from "@/lib/money";
import { priceToClaimTopCents, topStandingBidCents } from "@/lib/ranking";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ category: c.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/coaches/[category]">): Promise<Metadata> {
  const { category: slug } = await params;
  const category = getCategory(slug);
  if (!category) return {};

  const title = `${category.label} coaches - paid leaderboard`;
  const description = `${category.label} coaches ranked by how much they have paid for their position on CoachRank. Rank = bid, nothing else. ${category.blurb}`;

  return {
    title,
    description,
    alternates: { canonical: `/coaches/${category.slug}` },
    openGraph: {
      title: `${title} · ${SITE.name}`,
      description,
      url: absoluteUrl(`/coaches/${category.slug}`),
      type: "website",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: PageProps<"/coaches/[category]">) {
  const { category: slug } = await params;
  if (!isCategorySlug(slug)) notFound();
  const category = getCategory(slug)!;

  const search = await searchParams;
  const requestedPage =
    Number(Array.isArray(search.page) ? search.page[0] : search.page) || 1;

  const [
    board,
    listedCoaches,
    pricing,
    spotlights,
    stats,
    onlineCount,
    todayEntries,
    activity,
  ] = await Promise.all([
    getRankedBoard(),
    getListedCoaches(),
    getPricing(),
    getSpotlights(),
    getSiteStats(),
    getOnlineCount(),
    getTodayBoardForCategory(slug),
    getRecentActivity(),
  ]);

  const nowMs = requestNowMs();
  const inCategory = board.filter((l) => l.category === slug);
  const listedInCategory = listedCoaches.filter((l) => l.category === slug);
  const currentTopCents = topStandingBidCents(board);
  const claimTopCents = priceToClaimTopCents(currentTopCents, pricing);
  const categoryTopCents = topStandingBidCents(inCategory);

  const { items, page, pageCount } = paginate(
    inCategory,
    requestedPage,
    LEADERBOARD_PAGE_SIZE,
  );

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Leaderboard", item: SITE.url },
      {
        "@type": "ListItem",
        position: 2,
        name: "Categories",
        item: absoluteUrl("/categories"),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: category.label,
        item: absoluteUrl(`/coaches/${category.slug}`),
      },
    ],
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
          pricing={pricing}
          leaderName={board[0]?.name ?? null}
          paymentsEnabled={isDodoConfigured()}
        />
      </div>

      <SpotlightRail
        spotlights={spotlights}
        pricing={pricing}
        nowMs={nowMs}
        toolbar={<CategoryTabs active={slug} board="all-time" />}
      >
        <header className="mb-2">
          <nav
            aria-label="Breadcrumb"
            className="eyebrow flex items-center gap-2"
          >
            <Link href="/" className="hover:text-ink">
              Board
            </Link>
            <span aria-hidden="true" className="text-line-2">
              /
            </span>
            <Link href="/categories" className="hover:text-ink">
              Categories
            </Link>
            <span aria-hidden="true" className="text-line-2">
              /
            </span>
            <span className="text-ink">{category.label}</span>
          </nav>

          <h1 className="display mt-4 text-[clamp(1.75rem,4vw,2.5rem)] leading-none">
            {category.label}
          </h1>

          {inCategory.length > 0 ? (
            <p className="meta mt-3">
              <span className="tnum text-ink">{inCategory.length}</span>{" "}
              {inCategory.length === 1 ? "coach" : "coaches"} · #1 costs{" "}
              <span className="tnum text-accent">
                {formatCents(
                  categoryTopCents + pricing.topPositionIncrementCents,
                )}
              </span>
            </p>
          ) : null}
        </header>

        <BoardSections
          listings={items}
          pricing={pricing}
          page={page}
          pageCount={pageCount}
          basePath={`/coaches/${category.slug}`}
          source="category"
          claimTopCents={
            inCategory.length === 0 ? pricing.minNewBidCents : claimTopCents
          }
          nowMs={nowMs}
          todayEntries={todayEntries}
          todaySeeAllHref={`/coaches/${category.slug}/today`}
          activity={activity}
          emptyCategoryLabel={category.label}
          headingLabel={`${category.label} coaches, all-time`}
        />
      </SpotlightRail>

      <CoachGrid coaches={listedInCategory} source="category" hideCategory />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
    </div>
  );
}
