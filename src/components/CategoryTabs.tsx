"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { CategoryIcon } from "./CategoryIcon";
import { CATEGORIES, type CategorySlug } from "@/lib/categories";

type Props = { active: CategorySlug | "all"; board: "all-time" | "today" };

/**
 * Fifteen pills do not fit on one line, so the row scrolls. Two things stop that reading
 * as "these are all the categories": the edge fades while there is more to the right, and
 * the count sits in the pinned link at the end. The active pill is scrolled into view on
 * arrival, so landing on /coaches/sports does not look like landing on an unrelated page.
 */
export function CategoryTabs({ active, board }: Props) {
  const suffix = board === "today" ? "/today" : "";
  const tabs = [
    { key: "all" as const, label: "All", href: board === "today" ? "/today" : "/" },
    ...CATEGORIES.map((c) => ({ key: c.slug, label: c.label, href: `/coaches/${c.slug}${suffix}` })),
  ];

  const railRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLAnchorElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    const measure = () => {
      // 2px of slack: sub-pixel widths otherwise leave a fade on at a true edge.
      setEdges({
        start: rail.scrollLeft > 2,
        end: rail.scrollLeft + rail.clientWidth < rail.scrollWidth - 2,
      });
    };
    measure();

    rail.addEventListener("scroll", measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(rail);
    return () => {
      rail.removeEventListener("scroll", measure);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [active]);

  return (
    <div className="flex items-center gap-2">
      <div className="relative min-w-0 flex-1">
        <nav aria-label="Categories" ref={railRef} className="rail">
          {tabs.map((tab) => {
            const isActive = tab.key === active;
            return (
              <Link
                key={tab.key}
                ref={isActive ? activeRef : undefined}
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13.5px] font-semibold transition-colors ${
                  isActive
                    ? "border-accent bg-accent text-on-accent"
                    : "border-line bg-card text-ink-2 hover:border-line-2 hover:text-ink"
                }`}
              >
                <CategoryIcon slug={tab.key} className={isActive ? "" : "opacity-55"} />
                {tab.label}
              </Link>
            );
          })}
        </nav>

        <div
          aria-hidden="true"
          style={{ backgroundImage: "linear-gradient(to left, transparent, var(--paper))" }}
          className={`pointer-events-none absolute inset-y-0 left-0 w-12 transition-opacity duration-200 ${
            edges.start ? "opacity-100" : "opacity-0"
          }`}
        />
        <div
          aria-hidden="true"
          style={{ backgroundImage: "linear-gradient(to right, transparent, var(--paper))" }}
          className={`pointer-events-none absolute inset-y-0 right-0 w-12 transition-opacity duration-200 ${
            edges.end ? "opacity-100" : "opacity-0"
          }`}
        />
      </div>

      <Link
        href="/categories"
        className="inline-flex shrink-0 items-center gap-1 rounded-full border border-line bg-card px-3.5 py-1.5 text-[13.5px] font-semibold text-ink transition-colors hover:border-line-2"
      >
        All {CATEGORIES.length}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="h-3.5 w-3.5"
        >
          <path d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    </div>
  );
}
