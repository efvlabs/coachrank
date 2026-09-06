import Link from "next/link";
import { MobileMenu } from "./MobileMenu";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { LiveStatsPill } from "./LiveStatsPill";

export function Header() {
  return <header className="site-header">
    <div className="site-header-inner">
      <Link href="/" className="site-signature" aria-label="CoachRank home"><Logo size={38} /></Link>
      <div className="site-live-stats"><LiveStatsPill /></div>
      <nav aria-label="Main" className="site-primary-nav"><Link href="/rankings">Rankings ↗</Link><Link href="/categories">Categories</Link><Link href="/tools">Tools</Link><ThemeToggle /></nav>
      <div className="site-mobile-nav"><MobileMenu /></div>
    </div>
  </header>;
}
