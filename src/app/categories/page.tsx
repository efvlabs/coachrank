import Link from "next/link";

import { CoachAvatar } from "@/components/CoachAvatar";
import { CATEGORIES } from "@/lib/categories";
import { SITE, absoluteUrl } from "@/lib/config";
import { getCategorySummaries } from "@/lib/domain/listings";
import { getPricing } from "@/lib/domain/settings";
import { formatCents } from "@/lib/money";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Categories",
  description:
    "Five coaching categories on CoachRank: business, startup and founder, executive and leadership, life, and sports. One bid sets both the overall and category rank.",
  alternates: { canonical: "/categories" },
  openGraph: { title: `Categories · ${SITE.name}`, url: absoluteUrl("/categories") },
};

export default async function CategoriesPage() {
  const [summaries, pricing] = await Promise.all([
    getCategorySummaries(CATEGORIES.map((c) => c.slug)),
    getPricing(),
  ]);

  return (
    <div className="mx-auto max-w-[1240px] px-5 py-14 sm:px-8">
      <header className="mx-auto max-w-[40ch] text-center">
        <h1 className="display text-[clamp(2.25rem,6vw,3.5rem)]">Categories</h1>
        <p className="mt-4 text-[15px] leading-[1.55] text-ink-2">
          Every category has its own ranking. Pick one to see who leads it.
        </p>
      </header>

      <ul className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {summaries.map((summary) => {
          const category = CATEGORIES.find((c) => c.slug === summary.category)!;
          const claimCents = summary.leader
            ? summary.leader.standingBidCents + pricing.topPositionIncrementCents
            : pricing.minNewBidCents;

          return (
            <li key={summary.category}>
              <Link
                href={`/coaches/${summary.category}`}
                className="card group flex h-full flex-col p-5 transition-colors hover:border-line-2"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="display text-[20px] leading-tight group-hover:text-accent">
                    {category.label}
                  </h2>
                  <span className="tnum shrink-0 text-[12.5px] text-ink-3">
                    {summary.coachCount === 0
                      ? "open"
                      : `${summary.coachCount} ${summary.coachCount === 1 ? "coach" : "coaches"}`}
                  </span>
                </div>

                {summary.leader ? (
                  <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-tint px-3 py-2.5">
                    <span className="tnum flex h-6 shrink-0 items-center rounded-full bg-accent px-2 text-[11.5px] font-bold text-on-accent">
                      #1
                    </span>
                    <CoachAvatar
                      name={summary.leader.name}
                      displayWebsite={summary.leader.displayWebsite}
                      size={22}
                      className="rounded-md"
                    />
                    <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-ink">
                      {summary.leader.name}
                    </span>
                    <span className="display tnum shrink-0 text-[16px] text-ink">
                      {formatCents(summary.leader.standingBidCents)}
                    </span>
                  </div>
                ) : (
                  <p className="mt-4 rounded-xl border border-dashed border-line-2 px-3 py-2.5 text-[13px] text-ink-3">
                    Nobody has claimed #1
                  </p>
                )}

                <p className="buy mt-auto pt-4">
                  {summary.leader ? "View ranking →" : `Claim #1 · ${formatCents(claimCents)} →`}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
