import Link from "next/link";

import { Fill, LegalPage } from "@/components/LegalPage";
import { SITE, absoluteUrl } from "@/lib/config";

export const metadata = {
  title: "Privacy",
  description: "What CoachRank collects, why, who it is shared with, and what it never does.",
  alternates: { canonical: "/privacy" },
  openGraph: { title: `Privacy · ${SITE.name}`, url: absoluteUrl("/privacy") },
};

export default function PrivacyPage() {
  const mail = <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>;

  return (
    <LegalPage
      title="Privacy"
      updated="August 2026"
      intro={
        <p>
          How CoachRank handles information when you visit, click a listing or pay for a position.
          It sits alongside the <Link href="/terms">Terms</Link>.
        </p>
      }
    >
      <h2>Who is responsible</h2>
      <p>
        The controller for personal data processed here is <Fill>legal name</Fill>, based in{" "}
        <Fill>country</Fill>. Contact: {mail}.
      </p>

      <h2>What we collect</h2>
      <p>The site is deliberately small. We collect what it takes to run the board and nothing more.</p>
      <ul>
        <li>
          <strong>Listing details.</strong> The name, website and category you submit. All three are
          public by design.
        </li>
        <li>
          <strong>Payment records.</strong> The amount, the resulting position, and the payment
          identifier from Dodo Payments. Card details are collected by Dodo and never reach us.
        </li>
        <li>
          <strong>A visitor cookie.</strong> <code>cr_visitor</code> — a random opaque token, stored
          up to a year, used once to count your browser in the visitor total. It is not your name and
          is not used for advertising.
        </li>
        <li>
          <strong>A presence cookie.</strong> <code>cr_presence</code> — a random token that expires
          within a day, used only to count how many people are on the site right now.
        </li>
        <li>
          <strong>An admin session cookie.</strong> <code>cr_admin</code> — set only for
          administrators who sign in, and only for them.
        </li>
        <li>
          <strong>Click counts.</strong> When you follow a listing we increment a counter for that
          listing and a total for the site. We record that a click happened, not who made it.
        </li>
        <li>
          <strong>Correspondence.</strong> If you email us, we keep that exchange as long as we need
          it to respond and to keep a record.
        </li>
      </ul>
      <p>
        Your browser may also store a theme preference locally. That never leaves your device.
      </p>

      <h2>Why we are allowed to</h2>
      <ul>
        <li>
          <strong>Contract.</strong> To take payment, publish or raise a listing, and show the rank
          you paid for.
        </li>
        <li>
          <strong>Legitimate interests.</strong> To keep the board fair and working — rate limiting,
          abuse prevention, counting traffic, debugging, and defending legal claims. You can object
          to this processing; see your rights below.
        </li>
        <li>
          <strong>Legal obligation.</strong> To keep tax, accounting and complaint records where the
          law requires it.
        </li>
      </ul>

      <h2>Listings are public</h2>
      <p>
        Names, bios, categories, standing bids, ranks, click totals and destination links are public
        and indexable by search engines. Do not list a website if you do not want that shown.
      </p>
      <p>
        To show an icon for each listing our servers request it from public favicon services. Your
        browser never contacts those services directly, and we do not fetch the coach&apos;s own site
        to build the board.
      </p>

      <h2>Who else sees data</h2>
      <ul>
        <li>
          <strong>Dodo Payments</strong> — checkout and payment confirmation.
        </li>
        <li>
          <strong>Google Firebase</strong> — the database and administrator sign-in.
        </li>
        <li>
          <strong><Fill>hosting provider</Fill></strong> — serving the site.
        </li>
        <li>
          <strong>Public favicon services</strong> — the icon lookup described above, which receives
          only the listed domain name.
        </li>
        <li>
          Advisers, authorities, or a buyer of the service, where we must share to comply with the
          law, enforce the Terms, or transfer the project.
        </li>
      </ul>
      <p>
        <strong>We do not sell personal data</strong>, and there are no advertising networks or
        cross-site tracking pixels on this site.
      </p>

      <h2>Where data goes</h2>
      <p>
        Some of these providers operate outside your country, including outside the European Economic
        Area. Where that applies we rely on the safeguards those providers offer, such as standard
        contractual clauses.
      </p>

      <h2>How long we keep it</h2>
      <ul>
        <li>The visitor cookie lasts up to a year, or until you clear cookies.</li>
        <li>The presence cookie expires within a day, and stale presence records are swept away.</li>
        <li>
          Listings stay public while they are on the board, and may remain in backups and payment
          history after removal.
        </li>
        <li>
          Payment records are kept as long as accounting, tax and dispute handling require.
        </li>
      </ul>

      <h2>Your rights</h2>
      <p>
        Where the GDPR or a similar law applies, you can ask us to give you access to, correct,
        delete or export personal data we hold about you, to restrict or object to certain
        processing, and to withdraw consent where we relied on it. You may also complain to your
        data protection authority.
      </p>
      <p>
        Email {mail}. We may need enough detail to find your records. Note that listing content which
        also appears on your own website does not become private simply because a listing is removed
        — but you can ask us to remove the listing at any time.
      </p>

      <h2>Children</h2>
      <p>
        CoachRank is for adults. We do not knowingly collect data from children. If you believe a
        child has used the service, contact us and we will delete what we can identify.
      </p>

      <h2>Changes</h2>
      <p>
        We update this page when the service or the law changes. The date at the top is the current
        version.
      </p>
    </LegalPage>
  );
}
