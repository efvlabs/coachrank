import Link from "next/link";

import { BoardSwitch } from "./BoardSwitch";
import { Logo } from "./Logo";
import { MobileMenu } from "./MobileMenu";
import { ThemeToggle } from "./ThemeToggle";

const NAV = [
  { href: "/categories", label: "Categories" },
  { href: "/rules", label: "Rules" },
  { href: "/about", label: "About" },
] as const;

export function Header() {
  return (
    <header className="sticky top-0 z-30 bg-paper/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1120px] items-center gap-4 px-5 sm:px-8">
        <Link href="/" className="display flex items-center gap-2 text-[19px]">
          <Logo size={28} />
          CoachRank
        </Link>

        <BoardSwitch className="hidden sm:flex" />

        <nav aria-label="Main" className="ml-auto hidden items-center gap-1 sm:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-3 py-1.5 text-[14px] font-medium text-ink-2 transition-colors hover:bg-tint hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
          <ThemeToggle className="ml-1" />
        </nav>

        <div className="ml-auto sm:hidden">
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
