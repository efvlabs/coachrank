import type { Metadata } from "next";
import Link from "next/link";

import { EnrollForm } from "@/components/EnrollForm";
import { SITE, absoluteUrl } from "@/lib/config";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Get listed on CoachRank - free",
  description:
    "Add your coaching practice to CoachRank for free. A permanent page that ranks for your name, a live badge for your own site, and no payment unless you want to rank.",
  alternates: { canonical: "/enroll" },
  openGraph: {
    title: "Get listed on CoachRank - free",
    description: "A permanent page, a badge for your site, and no payment unless you want to rank.",
    url: absoluteUrl("/enroll"),
    siteName: SITE.name,
  },
};

const GETS = [
  ["A page that is yours", "A permanent page at coachrank.lol/r/your-name, which is what people find when they search for you."],
  ["A badge for your site", "A live rank badge you can put on your own site. It updates itself and links back to your page."],
  ["No payment", "Being listed costs nothing and always will. Paying is only for ranking on the leaderboard."],
] as const;

export default function EnrollPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-14 sm:px-8">
      <header className="text-center">
        <h1 className="display text-[clamp(2rem,6vw,3rem)] leading-none">Get listed. Free.</h1>
        <p className="mx-auto mt-4 max-w-[52ch] text-[15px] leading-relaxed text-ink-2">
          CoachRank lists coaches and ranks the ones who pay. Being listed is free and always
          will be - you appear in the directory, unranked, with a page of your own.
        </p>
      </header>

      <div className="mt-9">
        <EnrollForm />
      </div>

      <ul className="mt-10 grid gap-3 sm:grid-cols-3">
        {GETS.map(([title, body]) => (
          <li key={title} className="card p-5">
            <h2 className="text-[14.5px] font-semibold text-ink">{title}</h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-3">{body}</p>
          </li>
        ))}
      </ul>

      <section className="mt-10 border-t border-line pt-6">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-3">
          What listing is not
        </h2>
        <p className="mt-2 max-w-[62ch] text-[13.5px] leading-relaxed text-ink-2">
          Being listed is not a recommendation, a review, or a claim by us that you are any
          good - we do not vet anyone and we say so on every page. It means your practice is in
          the directory and findable. The <Link href="/">leaderboard</Link> is separate, and a
          position on it is bought: see the <Link href="/rules">Rules</Link>.
        </p>
      </section>
    </div>
  );
}
