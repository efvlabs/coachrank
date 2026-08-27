"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { ThemeToggle } from "./ThemeToggle";

const LINKS = [
  { href: "/", label: "Leaderboard" },
  { href: "/today", label: "Today" },
  { href: "/categories", label: "Categories" },
  { href: "/rules", label: "Rules" },
  { href: "/about", label: "About" },
] as const;

export function MobileMenu() {
  const pathname = usePathname() ?? "/";
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenedOn(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="flex items-center gap-1">
      <ThemeToggle />
      <button
        type="button"
        onClick={() => setOpenedOn(open ? null : pathname)}
        aria-expanded={open}
        aria-controls="mobile-nav"
        className="rounded-full border border-line bg-card px-3.5 py-1.5 text-[13px] font-semibold"
      >
        {open ? "Close" : "Menu"}
      </button>

      {open ? (
        <nav
          id="mobile-nav"
          className="absolute inset-x-0 top-full z-40 border-y border-line bg-card px-5 py-2"
        >
          <ul>
            {LINKS.map((link) => (
              <li key={link.href} className="border-b border-line last:border-0">
                <Link
                  href={link.href}
                  onClick={() => setOpenedOn(null)}
                  className="display block py-3 text-[18px]"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
