export const CATEGORIES = [
  {
    slug: "business",
    label: "Business",
    noun: "Business Coach",
    blurb: "Coaches working on revenue, sales, operations and growth.",
  },
  {
    slug: "startup-founder",
    label: "Startup & Founder",
    noun: "Startup & Founder Coach",
    blurb: "Coaches working with founders on product, fundraising and pace.",
  },
  {
    slug: "executive-leadership",
    label: "Executive & Leadership",
    noun: "Executive & Leadership Coach",
    blurb: "Coaches working with executives, managers and leadership teams.",
  },
  {
    slug: "life",
    label: "Life",
    noun: "Life Coach",
    blurb: "Coaches working on habits, direction, confidence and change.",
  },
  {
    slug: "sports",
    label: "Sports",
    noun: "Sports Coach",
    blurb: "Coaches working on athletic performance, technique and mindset.",
  },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_SLUGS: readonly CategorySlug[] = CATEGORIES.map((c) => c.slug);

export function isCategorySlug(value: unknown): value is CategorySlug {
  return typeof value === "string" && (CATEGORY_SLUGS as readonly string[]).includes(value);
}

export function getCategory(slug: string): Category | null {
  return CATEGORIES.find((c) => c.slug === slug) ?? null;
}

export function categoryLabel(slug: string): string {
  return getCategory(slug)?.label ?? slug;
}

/** "Business Coach" — a factual descriptor. Never a quality claim. */
export function categoryNoun(slug: string): string {
  return getCategory(slug)?.noun ?? "Coach";
}
