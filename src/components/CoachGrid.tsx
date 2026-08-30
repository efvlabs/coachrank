import Link from "next/link";

import { CoachAvatar } from "./CoachAvatar";
import { categoryLabel } from "@/lib/categories";
import type { ClickSource } from "@/lib/config";
import { prettyWebsite } from "@/lib/url";
import type { Listing } from "@/lib/domain/types";

type Props = {
  coaches: Listing[];
  source: ClickSource;
  /** Set on a category page, where repeating the category on every card is noise. */
  hideCategory?: boolean;
};

/**
 * Everyone else. Enrolled, approved, and holding no rank - which is the honest place for
 * a coach who has paid nothing on a board whose only promise is that rank is the amount
 * paid. Alphabetical, so the order says nothing either.
 */
export function CoachGrid({ coaches, source, hideCategory = false }: Props) {
  if (coaches.length === 0) return null;

  return (
    <section aria-labelledby="coaches" className="mt-14">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="coaches" className="display text-[22px] leading-none">
          Featured Coaches
        </h2>
        <p className="text-[12.5px] text-ink-3">
          {coaches.length} listed · unranked · <Link href="/enroll" className="hover:text-ink">add yourself</Link>
        </p>
      </div>

      <ul className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {coaches.map((coach) => (
          <li key={coach.id}>
            <article className="card flex h-full items-center gap-3 px-4 py-3.5 transition-colors hover:border-line-2">
              <CoachAvatar
                name={coach.name}
                displayWebsite={coach.displayWebsite}
                size={34}
                className="shrink-0 rounded-lg"
              />
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-[15px] font-semibold leading-tight text-ink">
                  <Link href={`/r/${coach.slug}`} className="hover:text-accent">
                    {coach.name}
                  </Link>
                </h3>
                <p className="mt-0.5 truncate text-[12px] text-ink-3">
                  {hideCategory ? null : `${categoryLabel(coach.category)} · `}
                  <a
                    href={`/go/${coach.id}?source=${source}`}
                    rel="nofollow noopener sponsored"
                    target="_blank"
                    className="hover:text-ink"
                  >
                    {prettyWebsite(coach.displayWebsite)}
                  </a>
                </p>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}
