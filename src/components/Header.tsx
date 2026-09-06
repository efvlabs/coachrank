import Link from "next/link";
import { MobileMenu } from "./MobileMenu";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { LiveStatsPill } from "./LiveStatsPill";

export function Header() {
  return <header className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur-md">
    <div className="mx-auto grid max-w-[1360px] grid-cols-[1fr_auto] items-center gap-x-5 px-5 sm:px-10 xl:min-h-16 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
      <Link href="/" className="display flex h-16 w-fit items-center gap-2.5 text-[20px]" aria-label="CoachRank home"><Logo size={25} />CoachRank</Link>
      <div className="order-3 col-span-2 min-w-0 pb-3 xl:order-none xl:col-span-1 xl:max-w-[620px] xl:py-2">
        <LiveStatsPill />
      </div>
      <nav aria-label="Main" className="hidden items-center justify-self-end gap-5 sm:flex xl:gap-4">
        <Link href="/tools" className="text-[14px] font-medium hover:text-accent">Tools</Link>
        <Link href="/rankings" className="text-[14px] font-medium hover:text-accent">Rankings ↗</Link>
        <Link href="/categories" className="text-[14px] font-medium hover:text-accent">Categories</Link>
        <ThemeToggle />
      </nav>
      <div className="justify-self-end sm:hidden"><MobileMenu /></div>
    </div>
  </header>;
}
