import Link from "next/link";

import { Fill, LegalPage } from "@/components/LegalPage";
import { SITE, absoluteUrl } from "@/lib/config";

export const metadata = {
  title: "Terms",
  description: "The terms that apply to listing on, bidding on and using CoachRank.",
  alternates: { canonical: "/terms" },
  openGraph: { title: `Terms · ${SITE.name}`, url: absoluteUrl("/terms") },
};

export default function TermsPage() {
  const mail = <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>;

  return (
    <LegalPage
      title="Terms"
      updated="August 2026"
      intro={
        <p>
          These terms govern use of coachrank.lol - the public board, listing pages, checkout and
          everything around them. By using the site, creating a listing or completing a payment you
          agree to them and to the <Link href="/privacy">Privacy Policy</Link>. If you do not agree,
          do not list and do not pay.
        </p>
      }
    >
      <h2>Who operates this</h2>
      <p>
        CoachRank is operated by <Fill>legal name</Fill>, based in <Fill>country</Fill>
        (&ldquo;we&rdquo;, &ldquo;us&rdquo;). Legal, listing and takedown notices: {mail}.
      </p>
      <p>
        These terms work alongside the public <Link href="/rules">Rules</Link>. Where the two
        conflict, these terms control.
      </p>
      <p>
        Before checkout you must confirm, by ticking a box, that you have read and agree to these
        terms. If you do not agree, do not pay. You can also reach us at{" "}
        {SITE.socials.map((s, i) => (
          <span key={s.label}>
            {i > 0 ? " or " : ""}
            <a href={s.href} target="_blank" rel="noopener">
              {s.label}
            </a>
          </span>
        ))}
        , though legal and takedown notices should go to {mail}.
      </p>

      <h2>What the service is</h2>
      <p>
        CoachRank is a paid public ranking. You may pay to list a coaching website and to occupy a
        position based on the amount paid. <strong>Listings are advertisements</strong> - not
        editorial reviews, certifications, endorsements or independent rankings.
      </p>
      <p>
        A payment buys the position that amount supports at the moment it is fulfilled. It does not
        buy traffic, clicks, clients, revenue, exclusivity, a fixed duration at any rank, search
        placement, or any particular outcome. Anyone can pay more and move above you. We may change,
        pause or discontinue features, including categories, spotlights and pricing.
      </p>

      <h2>Eligibility</h2>
      <ul>
        <li>You must be at least 18 and able to enter a binding contract.</li>
        <li>
          If you list on behalf of a business, you confirm you can bind it, and &ldquo;you&rdquo;
          includes that business.
        </li>
        <li>
          You may not use the service if sanctions or other applicable law prohibit us from
          providing it to you.
        </li>
      </ul>

      <h2 id="payments">Payments and taxes</h2>
      <p>
        Checkout is handled by Dodo Payments. We never receive or store card numbers. Dodo&apos;s own
        terms and privacy notice apply to the payment itself. Prices are in US dollars and applicable
        taxes may be added at checkout.
      </p>
      <p>
        Minimums, increments and the pay-only-the-difference calculation are set out in the{" "}
        <Link href="/rules">Rules</Link> and shown before you pay. Completing checkout is an offer to
        buy placement on those terms; the rank is assigned when the payment is confirmed to our
        server and written to the board.
      </p>

      <h2 id="refunds">No refunds</h2>
      <p>
        Leaderboard payments are final. Placement is a digital service that begins the instant
        payment is confirmed: the listing is created or the standing bid is raised, and the amount
        appears publicly. Being outbid later, dropping off the Today board after 24 hours, receiving
        fewer clicks than you hoped, downtime, or removal for breach of these terms do not create a
        refund.
      </p>
      <p>
        By completing checkout you ask us to begin that service immediately and accept that you lose
        any statutory cancellation or cooling-off right to the extent the law permits that waiver.
        Where a consumer right cannot be waived, we honour it. Spotlight payments that cannot be
        honoured because the slot was already taken are refunded.
      </p>
      <p>
        Raising a chargeback or reversing a payment without a legally valid basis is a breach of
        these terms. We may remove the listing and refuse future use of the service.
      </p>
      <p>
        Rank is bought with money we actually hold. Where a payment is refunded, charged back or
        otherwise reversed, the amount it contributed is removed from the standing bid and the
        position it bought is given up automatically. A listing left with nothing paid for comes
        off the board, and a chargeback removes the listing outright as a breach of these Terms. A
        Spotlight whose payment is reversed ends immediately.
      </p>
      <p>
        Removal is the only remedy we offer, and it is not a refund. You may ask us at any time to
        take down your listing or end a running Spotlight, and we will do it - but taking a listing
        down does not return the money that bought its rank, and ending a Spotlight early does not
        return the unused hours. A Spotlight is a 24-hour placement that begins as soon as the
        payment clears; it is not refundable once it is running.
      </p>

      <h2>Your listing</h2>
      <p>By submitting a listing or a payment you represent that:</p>
      <ul>
        <li>You own or are authorised to represent the website you submit.</li>
        <li>
          That site identifies who is behind it, and carries whatever operator, business-register or
          tax details the law applying to it requires.
        </li>
        <li>
          The listing and its destination comply with applicable law, including advertising,
          consumer, privacy, intellectual-property and regulated-profession rules.
        </li>
        <li>
          You are not impersonating anyone, and you are not claiming a rank for a competitor&apos;s
          site.
        </li>
        <li>The destination is not malware, phishing, a scam, or built to deceive.</li>
        <li>What you submit is accurate, and you will keep it accurate.</li>
      </ul>
      <p>
        Details that are missing, false or unverifiable are grounds for removal without refund.
      </p>

      <h2>Prohibited listings and use</h2>
      <p>In addition to the Rules, you may not list or use CoachRank for:</p>
      <ul>
        <li>Adult or sexual content, or chat, invite and messaging-group links.</li>
        <li>Link shorteners used to conceal a destination.</li>
        <li>
          Anything illegal, fraudulent, defamatory, harassing, hateful, violent, or that exploits
          children.
        </li>
        <li>Counterfeit goods or infringement of copyright, trademark or other rights.</li>
        <li>
          Offers requiring licences you do not hold, including certain financial, medical, legal and
          gambling services.
        </li>
        <li>
          Interfering with the service: scraping beyond ordinary browsing, inflating click counts,
          evading rate limits, or automating rank claims without our written permission.
        </li>
      </ul>

      <h2>Removing listings</h2>
      <p>
        We may refuse, delay, edit, recategorise, hide or permanently remove any listing, with or
        without notice, where we believe these terms, the Rules or the law may have been broken,
        where a rights holder complains, or where a listing creates legal, security or reputational
        risk. Removal does not entitle you to a refund.
      </p>

      <h2>Third-party names and images</h2>
      <p>
        To make listings recognisable we display the coach&apos;s name as submitted, and an icon for
        the listed website. Icons are retrieved by our servers from public favicon services and
        cached; where none is available we generate a plain initials mark instead.
      </p>
      <p>
        We use such material only to identify the listed destination and to show visitors where a
        paid position leads. We do not present it as our own brand and we do not imply sponsorship
        or endorsement by any rights holder. The CoachRank name and the design of this site are
        ours; please do not copy the board for a competing product.
      </p>

      <h2>Licence you grant us</h2>
      <p>
        You grant us a worldwide, non-exclusive, royalty-free licence to host, cache, reproduce,
        resize and publicly display your listing and the public metadata we retrieve for it, for as
        long as we need it to run and archive the service. If you want a listing taken down, email{" "}
        {mail}. A takedown does not reverse a completed payment.
      </p>

      <h2>Complaints and rights notices</h2>
      <p>
        If you believe a listing infringes your rights or that a listed site is unlawful, email{" "}
        {mail} with: your name and contact details; the CoachRank listing URL; the destination URL;
        what the problem is; and a statement that your notice is accurate and that you are the rights
        holder or authorised to act for them. We may restrict the listing while we review, and may
        share the notice with the person who listed it. Repeat or abusive notices may be disregarded.
      </p>

      <h2>No endorsement, no earnings claims</h2>
      <p>
        A position on the board is not our opinion of a coach. We do not verify claims, credentials,
        prices or results. Click and visitor counts describe what our systems recorded; they are not
        a prediction of what you will receive. Outcomes depend on your rank, your website, timing and
        factors outside our control.
      </p>
      <p>
        Links from CoachRank leave our site. Those destinations have their own terms and practices
        and we are not responsible for them.
      </p>

      <h2>Availability and changes</h2>
      <p>
        The service is provided as-is. It may be unavailable, slow or wrong. We may change ranking
        parameters, categories, prices or these terms; if a change is material we will update the
        date at the top of this page. For a payment already completed, the terms in force at
        checkout continue to apply to it, except where a change is required by law or to address a
        security risk.
      </p>

      <h2>Disclaimers</h2>
      <p>
        To the fullest extent the law allows, we disclaim all warranties, express or implied,
        including merchantability, fitness for a particular purpose and non-infringement. We do not
        warrant that the service will be uninterrupted or error-free, or that listings, names, icons,
        ranks or click counts are accurate or complete.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        Nothing here limits liability that applicable law says cannot be limited, including for
        intent, gross negligence, or injury to life, body or health. Subject to that:
      </p>
      <ul>
        <li>
          We are not liable for lost profits, lost data, lost goodwill, substitute services, or other
          indirect or consequential damages.
        </li>
        <li>
          Our total liability for any claim relating to a payment is limited to the amount you paid
          us for the listing concerned in the three months before the claim.
        </li>
      </ul>

      <h2>Indemnity</h2>
      <p>
        You will defend and indemnify us against claims, damages, losses and reasonable legal costs
        arising from your listing, your website, your payment or chargeback, your breach of these
        terms, or your infringement of anyone&apos;s rights.
      </p>

      <h2>Governing law</h2>
      <p>
        These terms are governed by the laws of <Fill>governing law</Fill>, excluding its
        conflict-of-law rules, and the courts of <Fill>jurisdiction</Fill> have exclusive
        jurisdiction to the extent permitted. If you are a consumer with mandatory local protections,
        those continue to apply to you.
      </p>

      <h2>General</h2>
      <ul>
        <li>
          If any part of these terms is unenforceable, the rest stands and the invalid part is
          replaced by the closest valid equivalent.
        </li>
        <li>Not enforcing a provision is not a waiver of it.</li>
        <li>
          You may not assign these terms without our consent; we may assign them if the service is
          transferred.
        </li>
        <li>
          These terms, the Rules, the Privacy Policy and what you confirm at checkout are the entire
          agreement between us.
        </li>
      </ul>
    </LegalPage>
  );
}
