import Link from "next/link";

import { SITE, absoluteUrl } from "@/lib/config";

export const metadata = {
  title: "About",
  description:
    "CoachRank is a public paid leaderboard for coaches. Put money behind your name, move up the board, get seen. Rank = bid, nothing else.",
  alternates: { canonical: "/about" },
  openGraph: { title: `About · ${SITE.name}`, url: absoluteUrl("/about") },
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-[1180px] px-5 py-14 sm:px-8">
      <h1 className="display max-w-[16ch] text-[clamp(2.5rem,8vw,5rem)] leading-[0.95]">
        Coaches tell people how to win.
      </h1>
      <p className="display mt-6 max-w-[22ch] text-[clamp(1.5rem,4vw,2.25rem)] leading-[1.05] text-accent">
        So we made them compete.
      </p>

      <div className="mt-16 grid gap-x-16 gap-y-10 pt-10 sm:grid-cols-2">
        <div>
          <h2 className="eyebrow text-ink">What this is</h2>
          <p className="mt-4 text-[16px] leading-[1.6] text-ink-2">
            A public paid leaderboard. Pay to list, pay more to move up. The figure beside a name is
            the total that coach has committed to their position, and that is the only thing it
            measures.
          </p>
        </div>

        <div>
          <h2 className="eyebrow text-ink">What it is not</h2>
          <p className="mt-4 text-[16px] leading-[1.6] text-ink-2">
            Not a review, a rating, an endorsement or a credential. We do not vet coaches and we
            recommend nobody. A paid ranking that pretends to be a quality ranking is a lie; one that
            says exactly what it is turns out to be useful.
          </p>
        </div>

        <div>
          <h2 className="eyebrow text-ink">Why three fields</h2>
          <p className="mt-4 text-[16px] leading-[1.6] text-ink-2">
            A listing is a name, a website and a category. No photos, no rates, no calendars, no
            reviews, no accounts. Anyone who wants more clicks straight through to your site.
          </p>
        </div>

        <div>
          <h2 className="eyebrow text-ink">Why bids are permanent</h2>
          <p className="mt-4 text-[16px] leading-[1.6] text-ink-2">
            Your standing bid never expires. Raise it and you pay only the difference. Get outbid and
            you keep every dollar — you move down, not off, until you decide to take the spot back.
          </p>
        </div>
      </div>

      <p className="display mt-20 text-[clamp(2rem,6vw,3.5rem)] leading-none">
        Rank = bid. Nothing else.
      </p>

      <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3">
        <Link href="/#claim" className="btn btn-primary px-7 py-3.5">
          Claim a rank
        </Link>
        <Link href="/rules" className="buy">
          Read the rules →
        </Link>
      </div>

      <p className="meta mt-14">
        <a href={`mailto:${SITE.contactEmail}`} className="text-accent hover:underline">
          {SITE.contactEmail}
        </a>
      </p>
    </div>
  );
}
