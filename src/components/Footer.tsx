import Link from "next/link";
import { SITE } from "@/lib/config";
import { EDITORIAL_TOPICS } from "@/lib/editorial";
import { Logo } from "./Logo";
import { SocialIcon } from "./SocialIcon";

export function Footer() {
  return <footer className="mx-auto mt-16 w-full max-w-[1360px] px-5 pb-8 sm:px-10">
    <div className="grid gap-10 border-t border-line-2 pt-9 sm:grid-cols-[1.5fr_1fr_1fr]">
      <div><Link href="/" aria-label="CoachRank home"><Logo size={34} /></Link>
        <p className="mt-3 max-w-[35ch] text-[14px] leading-relaxed text-ink-2">An independent editorial for ambitious people. Celebrating greatness. Understanding what builds it.</p>
        <a href="https://x.com/coachranklol" target="_blank" rel="me noopener noreferrer" className="mt-5 inline-flex items-center gap-2 text-[14px] hover:text-accent"><SocialIcon name="x" />Find us on X ↗</a>
      </div>
      <nav aria-label="Read"><p className="journal-label text-ink-3">Read</p><ul className="mt-4 space-y-2 text-[14px]">{EDITORIAL_TOPICS.map(topic => <li key={topic.slug}><Link href={`/topics/${topic.slug}`} className="hover:text-accent">{topic.label}</Link></li>)}</ul></nav>
      <nav aria-label="Information"><p className="journal-label text-ink-3">CoachRank</p><ul className="mt-4 space-y-2 text-[14px]">{[{href:"/tools",label:"CoachRank Tools"},{href:"/rankings",label:"Paid rankings"},{href:"/categories",label:"Coach categories"},{href:"/about",label:"About"},{href:"/rules",label:"Ranking rules"}].map(link=><li key={link.href}><Link href={link.href} className="hover:text-accent">{link.label}</Link></li>)}</ul></nav>
    </div>
    <div className="mt-10 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-line pt-5 text-[12px] text-ink-3"><p>© {new Date().getFullYear()} CoachRank. A little perspective goes a long way.</p><div className="flex flex-wrap gap-5"><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link><a href={`mailto:${SITE.contactEmail}`}>Contact</a></div></div>
    <p className="mt-4 text-[12px] text-ink-3">Rankings are paid advertising, ordered by cumulative bids. They are not editorial recommendations or assessments of coaching quality.</p>
  </footer>;
}
