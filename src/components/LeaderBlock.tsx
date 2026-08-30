import Link from "next/link";

import { ClaimButton } from "./ClaimButton";
import { CoachAvatar } from "./CoachAvatar";
import { categoryLabel } from "@/lib/categories";
import type { ClickSource } from "@/lib/config";
import { formatCents, formatCount } from "@/lib/money";
import { prettyWebsite } from "@/lib/url";
import type { RankedListing } from "@/lib/domain/types";

type Props = { listing: RankedListing; claimCents: number; source: ClickSource };

/**
 * The one inverted card on the page. Everything else stays quiet so #1 reads as a trophy -
 * and so a screenshot of it is worth posting.
 */
export function LeaderBlock({ listing, claimCents, source }: Props) {
  return (
    <article
      className="rounded-card bg-deep px-4 py-5 text-on-deep shadow-[var(--shadow-lift)] sm:px-6 sm:py-6"
      aria-label={`Rank 1: ${listing.name}`}
    >
      <div className="flex flex-wrap items-start gap-x-3 gap-y-4 sm:flex-nowrap sm:gap-x-4">
        <span className="flex h-7 shrink-0 items-center rounded-full bg-on-deep-accent px-2.5 text-[13px] font-bold text-deep">
          #1
        </span>

        <CoachAvatar
          name={listing.name}
          displayWebsite={listing.displayWebsite}
          listingId={listing.id}
          size={40}
          className="hidden rounded-xl sm:block"
        />

        <div className="min-w-0 flex-1 basis-[55%]">
          <h3 className="display text-[clamp(1.4rem,3.6vw,2rem)]">
            <Link href={`/r/${listing.slug}`} className="hover:underline">
              {listing.name}
            </Link>
          </h3>
          <ul className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12.5px] text-on-deep/60">
            <li>
              {categoryLabel(listing.category)} #{listing.categoryRank}
            </li>
            <li aria-hidden="true">·</li>
            <li>
              <a
                href={`/go/${listing.id}?source=${source}`}
                rel="nofollow noopener sponsored"
                target="_blank"
                className="inline-flex min-h-[24px] items-center hover:text-on-deep"
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
          <p className="display tnum text-[clamp(1.75rem,4.6vw,2.5rem)] text-on-deep-accent">
            {formatCents(listing.standingBidCents)}
          </p>
          <ClaimButton
            targetCents={claimCents}
            variant="onDeep"
            label={`Take #1 · ${formatCents(claimCents)}`}
          />
        </div>
      </div>
    </article>
  );
}
