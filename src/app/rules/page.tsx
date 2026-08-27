import Link from "next/link";

import { LegalPage } from "@/components/LegalPage";
import { SITE, TODAY_WINDOW_MS, absoluteUrl } from "@/lib/config";
import { getPricing } from "@/lib/domain/settings";
import { formatCents } from "@/lib/money";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Rules",
  description:
    "How CoachRank ranking works: cumulative standing bids, minimums and maximums, the #1 increment, ties, the rolling 24-hour Today board, spotlights, what may be listed, and payment verification.",
  alternates: { canonical: "/rules" },
  openGraph: { title: `Rules · ${SITE.name}`, url: absoluteUrl("/rules") },
};

export default async function RulesPage() {
  const pricing = await getPricing();
  const hours = Math.round(TODAY_WINDOW_MS / 3_600_000);
  const cents = (n: number) => <span className="tnum">{formatCents(n)}</span>;

  return (
    <LegalPage
      title="Rules"
      updated="August 2026"
      intro={
        <p>
          One mechanic, stated in full. Read this once and you know everything about how positions
          on CoachRank are decided.
        </p>
      }
    >
      <h2>Ranking</h2>
      <p>
        A higher cumulative standing bid ranks higher. Your standing bid is the total of every
        successful payment made for your listing. It is not a subscription, a fee or a score, and
        it never decays.
      </p>

      <h2>Amounts</h2>
      <ul>
        <li>
          A new listing starts at {cents(pricing.minNewBidCents)}. Any amount at or above that is
          accepted and lands wherever it reaches.
        </li>
        <li>
          The highest standing bid the board accepts is {cents(pricing.maxBidCents)}.
        </li>
        <li>Amounts are in US dollars and are charged in whole cents.</li>
      </ul>

      <h2>Taking #1</h2>
      <p>
        To take the top position your standing bid must exceed the current #1 by at least{" "}
        {cents(pricing.topPositionIncrementCents)}. If #1 sits at $500, the smallest bid that claims
        it is $505.
      </p>
      <p>
        You cannot land in between. An amount above the current #1 but below that threshold is
        rejected - pick a higher number, or any amount at or below the current #1.
      </p>

      <h2>Taking any other position</h2>
      <p>
        Everywhere else, {cents(pricing.standardIncrementCents)} more than the holder is enough. If
        #7 sits at $50, a standing bid of $51 takes that spot.
      </p>

      <h2>Raising your own bid</h2>
      <p>
        Enter the same website again and choose a higher number. Checkout charges only the
        difference: from $500 to $510 you pay $10, not $510. Money already on the board stays on the
        board.
      </p>
      <p>
        A raise must be at least {cents(pricing.standardIncrementCents)} above your current standing
        bid. Nobody can take your position by paying that same difference - they have to clear your
        full standing bid.
      </p>

      <h2>Ties</h2>
      <p>
        If two coaches hold identical standing bids, whoever reached that amount first stays higher.
      </p>

      <h2>All-time</h2>
      <p>
        The main board is permanent. Standing bids never expire and are never reset. Being outbid
        costs you position, not money - every dollar you have committed stays behind your name.
      </p>

      <h2>Today</h2>
      <p>
        Today is a rolling {hours}-hour window. Each payment counts toward it for exactly {hours}{" "}
        hours from the moment it succeeded, then drops off Today and only Today. The same payment
        also adds to your all-time standing bid, permanently.
      </p>

      <h2>Categories</h2>
      <p>
        One coach, one category. A single bid sets both your overall rank and your category rank;
        there is no separate category payment. If a listing is in the wrong category, email{" "}
        <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a> and we will move it.
      </p>

      <h2>A listing</h2>
      <p>A listing is three things: a name, a website and a category. Nothing else is collected.</p>

      <h2>What can be listed</h2>
      <ul>
        <li>The coach&apos;s own website - the place they would send a prospective client.</li>
        <li>
          The site must make clear who is behind it. A page with no identifiable operator can be
          removed.
        </li>
      </ul>

      <h2>What cannot</h2>
      <ul>
        <li>
          Social, chat and invite links: Instagram, LinkedIn, X, Facebook, TikTok, YouTube, Telegram,
          WhatsApp, Discord, Signal, Calendly, Google Docs and the like. Link your own site.
        </li>
        <li>Link shorteners, or any URL built to hide its real destination.</li>
        <li>Adult and sexual content.</li>
        <li>Malware, phishing, scams, and sites whose purpose is to mislead.</li>
        <li>Anyone else&apos;s website, unless you are authorised to represent it.</li>
        <li>
          Names that impersonate someone, or that carry superlatives - no &ldquo;best&rdquo;,
          &ldquo;#1&rdquo; or &ldquo;top-rated&rdquo;. The rank is paid, and the copy must not
          suggest otherwise.
        </li>
      </ul>

      <h2>How websites are matched</h2>
      <p>
        One website is one listing. Tracking and referral parameters are stripped, so{" "}
        <code>example.com</code>, <code>www.example.com/</code> and{" "}
        <code>example.com/?utm_source=x</code> are all the same listing. Distinct paths stay
        distinct, so two coaches on different pages of the same platform hold separate ranks.
      </p>

      <h2>Spotlights</h2>
      <p>
        The two spotlights beside the board are advertisements, not rankings.{" "}
        {pricing.premiumSpotlightCents === pricing.standardSpotlightCents ? (
          <>Both cost {cents(pricing.premiumSpotlightCents)}</>
        ) : (
          <>
            Spotlight I is {cents(pricing.premiumSpotlightCents)} and Spotlight II is{" "}
            {cents(pricing.standardSpotlightCents)}
          </>
        )}{" "}
        - each for exactly 24 hours from the moment payment is verified. Neither affects any position.
        Only a coach already on the board can rent one, and a slot cannot be double-booked - if a
        payment lands after its hold has lapsed and the slot is taken, that payment is refunded.
      </p>
      <p>
        A Spotlight starts the moment the payment clears, so it is not refundable once it is
        running - not partway through, and not because the clicks were fewer than you hoped. You
        can ask us to take it down early and we will, but the 24 hours are not returned as money.
      </p>

      <h2>Payments</h2>
      <p>
        Only a verified successful payment changes anything. Reaching a success page proves nothing:
        a listing is published, a standing bid moves and a spotlight activates only after our
        payment provider confirms the charge to our server.
      </p>
      <p>
        Because positions are live and competitive, your final rank is whatever your amount supports
        at the moment the payment clears - not what was displayed when you started checkout.
        Leaderboard payments are not refundable. If a payment is refunded or charged back anyway,
        the amount comes back off the standing bid and the rank it bought goes with it. See the{" "}
        <Link href="/terms">Terms</Link>.
      </p>

      <h2>Moderation</h2>
      <p>
        We may edit an obvious typo, move a mis-filed category, or hide a listing for impersonation,
        fraud, a rights complaint or a breach of these rules. Hidden listings do not rank and do not
        appear in activity. To report a listing, email{" "}
        <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>.
      </p>

      <h2>Disclosure</h2>
      <p>
        Rank represents the amount bid only. It is not a review, rating, endorsement, recommendation,
        certification, qualification or verified outcome. CoachRank does not vet, assess or recommend
        any coach, and a higher position says nothing about quality.
      </p>
    </LegalPage>
  );
}
