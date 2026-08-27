import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CoachAvatar } from "@/components/CoachAvatar";
import { ShareRank } from "@/components/ShareRank";
import { categoryLabel, categoryNoun } from "@/lib/categories";
import { SITE, absoluteUrl } from "@/lib/config";
import {
  computeRanks,
  getListingBySlug,
  getTopStandingBidExcludingCents,
} from "@/lib/domain/listings";
import { getPricing } from "@/lib/domain/settings";
import { relativeTime } from "@/lib/format";
import { formatCents, formatCount } from "@/lib/money";
import { prettyWebsite } from "@/lib/url";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/r/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getListingBySlug(slug);
  if (!listing || listing.status !== "active") {
    return { title: "Not found", robots: { index: false, follow: false } };
  }

  const ranks = await computeRanks(listing);
  const title = `${listing.name} - #${ranks.overallRank} on CoachRank`;
  const description = `${listing.name} holds #${ranks.overallRank} overall and #${ranks.categoryRank} in ${categoryLabel(listing.category)} with a standing bid of ${formatCents(listing.standingBidCents)}. Rank reflects money bid only.`;

  return {
    title,
    description,
    alternates: { canonical: `/r/${listing.slug}` },
    openGraph: {
      type: "profile",
      title,
      description,
      url: absoluteUrl(`/r/${listing.slug}`),
      siteName: SITE.name,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      site: SITE.twitter,
    },
  };
}

export default async function RankPage({ params }: PageProps<"/r/[slug]">) {
  const { slug } = await params;
  const listing = await getListingBySlug(slug);
  if (!listing || listing.status !== "active") notFound();

  const [ranks, pricing, topExcludingSelf] = await Promise.all([
    computeRanks(listing),
    getPricing(),
    getTopStandingBidExcludingCents(listing.id),
  ]);

  const isLeader = ranks.overallRank === 1;
  const outbidCents = isLeader
    ? Math.max(
        listing.standingBidCents + pricing.topPositionIncrementCents,
        pricing.minNewBidCents,
      )
    : listing.standingBidCents + pricing.standardIncrementCents;
  const firstName = listing.name.split(" ")[0];
  const shareUrl = absoluteUrl(`/r/${listing.slug}`);

  const facts = [
    { label: "Overall", value: `#${ranks.overallRank}`, accent: true },
    {
      label: categoryLabel(listing.category),
      value: `#${ranks.categoryRank}`,
      accent: false,
    },
    {
      label: "Standing bid",
      value: formatCents(listing.standingBidCents),
      accent: false,
    },
    {
      label: "Clicks sent",
      value: formatCount(listing.totalClicks),
      accent: false,
    },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Board", item: SITE.url },
      {
        "@type": "ListItem",
        position: 2,
        name: categoryLabel(listing.category),
        item: absoluteUrl(`/coaches/${listing.category}`),
      },
      { "@type": "ListItem", position: 3, name: listing.name, item: shareUrl },
    ],
  };

  return (
    <div className="mx-auto max-w-[760px] px-5 py-12 sm:px-8">
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-2 text-[12.5px] text-ink-3"
      >
        <Link href="/" className="hover:text-ink">
          Board
        </Link>
        <span aria-hidden="true" className="text-line-2">
          /
        </span>
        <Link href={`/coaches/${listing.category}`} className="hover:text-ink">
          {categoryLabel(listing.category)}
        </Link>
      </nav>

      <article className="mt-7">
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-3">
          {categoryNoun(listing.category)}
        </p>
        <h1 className="display mt-3 flex items-center gap-3 text-[clamp(2.25rem,7vw,4rem)]">
          <CoachAvatar
            name={listing.name}
            displayWebsite={listing.displayWebsite}
            size={44}
            className="rounded-xl"
          />
          {listing.name}
        </h1>

        {listing.bio ? (
          <p className="mt-5 max-w-[48ch] text-[16px] leading-[1.55] text-ink-2">
            {listing.bio}
          </p>
        ) : null}

        <dl
          className={`grid grid-cols-2 gap-px overflow-hidden rounded-card bg-line sm:grid-cols-4 ${
            listing.bio ? "mt-7" : "mt-8"
          }`}
        >
          {facts.map((fact) => (
            <div key={fact.label} className="bg-card px-4 py-4">
              <dt className="text-[11px] font-bold uppercase tracking-[0.09em] text-ink-3">
                {fact.label}
              </dt>
              <dd
                className={`display tnum mt-1.5 text-[clamp(1.4rem,4vw,1.9rem)] ${
                  fact.accent ? "text-accent" : "text-ink"
                }`}
              >
                {fact.value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
          <a
            href={`/go/${listing.id}?source=rank_page`}
            rel="nofollow noopener sponsored"
            target="_blank"
            className="btn btn-primary px-7 py-3"
          >
            Visit {firstName} →
          </a>
          <span className="meta">{prettyWebsite(listing.displayWebsite)}</span>
          <span className="meta ml-auto">
            Raised{" "}
            <time
              dateTime={new Date(listing.standingBidReachedAtMs).toISOString()}
            >
              {relativeTime(listing.standingBidReachedAtMs)}
            </time>
          </span>
        </div>
      </article>

      <section className="card mt-8 bg-tint p-6 text-center sm:p-8">
        <h2 className="display text-[clamp(1.35rem,3.6vw,1.85rem)]">
          Think you belong above {firstName}?
        </h2>
        <p className="mx-auto mt-3 max-w-[42ch] text-[14.5px] leading-[1.55] text-ink-2">
          {isLeader ? "Taking #1" : `Passing ${firstName}`} needs a standing bid
          of{" "}
          <span className="tnum font-semibold text-accent">
            {formatCents(outbidCents)}
          </span>
          . Already listed? You pay only the difference.
        </p>
        <Link
          href={`/?claim=${outbidCents}#claim`}
          className="btn btn-primary mt-5 px-7 py-3"
        >
          Outbid · {formatCents(outbidCents)}
        </Link>
      </section>

      <ShareRank
        url={shareUrl}
        name={listing.name}
        overallRank={ranks.overallRank}
        categoryRank={ranks.categoryRank}
        categoryLabel={categoryLabel(listing.category)}
      />

      <p className="meta mt-10">
        Rank reflects the amount bid and nothing else. It is not a review,
        rating, endorsement or measure of quality. Top bid excluding this
        listing: <span className="tnum">{formatCents(topExcludingSelf)}</span>.
      </p>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </div>
  );
}
