import Link from "next/link";

import { ClaimButton } from "./ClaimButton";
import { CoachAvatar } from "./CoachAvatar";
import { categoryLabel } from "@/lib/categories";
import type { ClickSource } from "@/lib/config";
import { formatCents, formatCount } from "@/lib/money";
import { prettyWebsite } from "@/lib/url";
import type { RankedListing } from "@/lib/domain/types";

type Props = {
  listing: RankedListing;
  claimCents: number;
  source: ClickSource;
  /** Ranks 2 and 3 sit on a tint so the podium still reads as a podium. */
  podium?: boolean;
};

export function LotRow({ listing, claimCents, source, podium = false }: Props) {
  return (
    <article
      className={`card flex flex-wrap items-start gap-x-3 gap-y-3 px-4 py-4 transition-colors sm:flex-nowrap sm:gap-x-4 sm:px-5 ${
        podium ? "border-accent/25 bg-tint" : "hover:border-line-2"
      }`}
      aria-label={`Rank ${listing.overallRank}: ${listing.name}`}
    >
      <span
        className={`tnum flex h-7 shrink-0 items-center rounded-full px-2.5 text-[13px] font-bold ${
          podium ? "bg-accent text-on-accent" : "bg-tint text-accent"
        }`}
      >
        #{listing.overallRank}
      </span>

      <CoachAvatar
        name={listing.name}
        displayWebsite={listing.displayWebsite}
        size={36}
        className="hidden rounded-lg sm:block"
      />

      <div className="min-w-0 flex-1 basis-[55%]">
        <h3 className="display text-[17px] leading-tight">
          <Link href={`/r/${listing.slug}`} className="hover:text-accent">
            {listing.name}
          </Link>
        </h3>
        <ul className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12.5px] text-ink-3">
          <li>
            <Link href={`/coaches/${listing.category}`} className="hover:text-ink">
              {categoryLabel(listing.category)} #{listing.categoryRank}
            </Link>
          </li>
          <li aria-hidden="true">·</li>
          <li>
            <a
              href={`/go/${listing.id}?source=${source}`}
              rel="nofollow noopener sponsored"
              target="_blank"
              className="inline-flex min-h-[24px] items-center hover:text-ink"
            >
              {prettyWebsite(listing.displayWebsite)}
            </a>
          </li>
          {listing.totalClicks > 0 ? (
            <>
              <li aria-hidden="true">·</li>
              <li className="tnum">{formatCount(listing.totalClicks)} clicks</li>
            </>
          ) : null}
        </ul>
      </div>

      <div className="flex w-full shrink-0 items-center justify-between gap-3 sm:w-auto sm:flex-col sm:items-end">
        <p className="display tnum text-[clamp(1.15rem,3vw,1.5rem)] text-ink">
          {formatCents(listing.standingBidCents)}
        </p>
        <ClaimButton targetCents={claimCents} label={`Take · ${formatCents(claimCents)}`} />
      </div>
    </article>
  );
}
