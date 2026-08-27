import Link from "next/link";

import { SectionHeading } from "./SectionHeading";
import { CoachAvatar } from "./CoachAvatar";
import { categoryLabel } from "@/lib/categories";
import { formatCents } from "@/lib/money";
import type { TodayEntry } from "@/lib/domain/types";

type Props = { entries: TodayEntry[]; seeAllHref?: string };

/** What was actually paid in the last rolling 24 hours. */
export function TodayInsert({ entries, seeAllHref = "/today" }: Props) {
  if (entries.length === 0) return null;

  return (
    <section aria-labelledby="today-top" className="mt-10">
      <SectionHeading id="today-top" title="Today" action={{ href: seeAllHref, label: "See all →" }} />

      <ol className="mt-3 grid gap-2.5 sm:grid-cols-3">
        {entries.slice(0, 3).map((entry, index) => (
          <li key={entry.listing.id}>
            <Link
              href={`/r/${entry.listing.slug}`}
              className="card flex h-full items-center gap-2.5 px-3.5 py-3 transition-colors hover:border-line-2"
            >
              <span className="tnum flex h-6 shrink-0 items-center rounded-full bg-tint px-2 text-[12px] font-bold text-accent">
                #{index + 1}
              </span>
              <CoachAvatar
                name={entry.listing.name}
                displayWebsite={entry.listing.displayWebsite}
                size={26}
                className="rounded-md"
              />
              <span className="min-w-0 flex-1">
                <span className="display block truncate text-[14.5px]">{entry.listing.name}</span>
                <span className="block truncate text-[12px] text-ink-3">
                  {categoryLabel(entry.listing.category)}
                </span>
              </span>
              <span className="display tnum shrink-0 text-[16px] text-accent">
                {formatCents(entry.todayCents)}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
