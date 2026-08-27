"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** All-time / Today. Category pages keep their category when the timeframe flips. */
export function BoardSwitch({ className = "" }: { className?: string }) {
  const pathname = usePathname() ?? "/";
  const category = pathname.match(/^\/coaches\/([a-z-]+)/)?.[1];
  const onToday = pathname.endsWith("/today");

  const items = [
    { href: category ? `/coaches/${category}` : "/", label: "All-time", active: !onToday },
    { href: category ? `/coaches/${category}/today` : "/today", label: "Today", active: onToday },
  ];

  return (
    <div
      className={`items-center gap-0.5 rounded-full border border-line bg-card p-0.5 ${className}`}
      role="group"
      aria-label="Timeframe"
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.active ? "page" : undefined}
          className={`rounded-full px-3 py-1 text-[13px] font-semibold transition-colors ${
            item.active ? "bg-accent text-on-accent" : "text-ink-3 hover:text-ink"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}
