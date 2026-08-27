import Link from "next/link";

import { CATEGORIES, type CategorySlug } from "@/lib/categories";

type Props = { active: CategorySlug | "all"; board: "all-time" | "today" };

export function CategoryTabs({ active, board }: Props) {
  const suffix = board === "today" ? "/today" : "";
  const tabs = [
    { key: "all" as const, label: "All", href: board === "today" ? "/today" : "/" },
    ...CATEGORIES.map((c) => ({ key: c.slug, label: c.label, href: `/coaches/${c.slug}${suffix}` })),
  ];

  return (
    <nav aria-label="Categories" className="rail">
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={`rounded-full border px-4 py-1.5 text-[13.5px] font-semibold transition-colors ${
              isActive
                ? "border-accent bg-accent text-on-accent"
                : "border-line bg-card text-ink-2 hover:border-line-2 hover:text-ink"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
