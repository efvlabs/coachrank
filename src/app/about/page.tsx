import Link from "next/link";
import { SITE } from "@/lib/config";

export const metadata = {
  title: "About CoachRank",
  description: "Celebrating greatness and understanding what builds it. Meet CoachRank, an independent editorial for ambitious people.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return <div className="journal-shell py-14">
    <p className="journal-label">A little about us</p>
    <h1 className="display mt-7 max-w-[18ch] text-[clamp(3rem,7vw,6rem)]">Celebrating greatness.<br /><span className="text-accent">Understanding what builds it.</span></h1>
    <div className="article-prose prose-doc mt-12 max-w-[740px]">
      <p>CoachRank is an independent editorial for ambitious people. We explore performance, business, creativity, growth and coaching: the practice, decisions and people behind exceptional work.</p>
      <p>Our aim is simple: give you a useful idea, a clearer question, or something you can put to work. We value specific examples, transparent sources and writing that respects your time.</p>
      <h2>Yes, the address ends in .lol.</h2>
      <p>Building a business is serious work. Taking yourself too seriously is optional. The address is a small reminder to keep a sense of humor while doing work you care about.</p>
      <h2>Editorial and rankings</h2>
      <p>We celebrate achievement while making room for setbacks, collaborators and difficult choices. Our editorial covers ideas and practical topics. Payment does not determine what we write or which articles we feature.</p>
      <p>The <Link href="/rankings">coach rankings</Link> are a separate advertising offering. Coaches bid for visibility; the cumulative amount paid determines their position. Those positions do not measure coaching quality, credentials, reviews or outcomes. We do not vet the coaches in the paid directory.</p>
      <p>Every bid amount is visible. A paid rank is never an editorial endorsement. Read the <Link href="/rules">ranking rules</Link> for the full mechanics.</p>
      <h2>Questions, ideas, corrections</h2>
      <p>Something we should explore, or something we should put right? Write to <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a>.</p>
    </div>
  </div>;
}
