/**
 * The category list. Declared in A-Z order by label, so the picker, the pills and the
 * categories page all read alphabetically without any caller having to sort.
 *
 * Slugs are permanent: they are public URLs (/coaches/<slug>) and are stored on every
 * listing. Renaming a label is safe; changing a slug is not.
 */
export const CATEGORIES = [
  {
    slug: "business",
    label: "Business",
    noun: "Business Coach",
    blurb: "Revenue, operations, pricing and growth.",
  },
  {
    slug: "career",
    label: "Career",
    noun: "Career Coach",
    blurb: "Direction, transitions, interviews and negotiation.",
  },
  {
    slug: "executive",
    label: "Executive",
    noun: "Executive Coach",
    blurb: "Senior operators, scope changes and the top job.",
  },
  {
    slug: "financial",
    label: "Financial",
    noun: "Financial Coach",
    blurb: "Money habits, debt, saving and planning.",
  },
  {
    slug: "health-wellness",
    label: "Health & Wellness",
    noun: "Health & Wellness Coach",
    blurb: "Energy, sleep, nutrition and sustainable habits.",
  },
  {
    slug: "leadership",
    label: "Leadership",
    noun: "Leadership Coach",
    blurb: "Managing people, teams and difficult conversations.",
  },
  {
    slug: "life",
    label: "Life",
    noun: "Life Coach",
    blurb: "Direction, confidence and change that sticks.",
  },
  {
    slug: "parenting",
    label: "Parenting",
    noun: "Parenting Coach",
    blurb: "Family dynamics, boundaries and the hard stages.",
  },
  {
    slug: "performance",
    label: "Performance",
    noun: "Performance Coach",
    blurb: "Focus, output and doing your best work on demand.",
  },
  {
    slug: "relationship",
    label: "Relationship",
    noun: "Relationship Coach",
    blurb: "Partners, communication and repair.",
  },
  {
    slug: "sales",
    label: "Sales",
    noun: "Sales Coach",
    blurb: "Pipeline, calls, closing and quota.",
  },
  {
    slug: "spiritual-mindfulness",
    label: "Spiritual & Mindfulness",
    noun: "Spiritual & Mindfulness Coach",
    blurb: "Meaning, practice, attention and stillness.",
  },
  {
    slug: "sports",
    label: "Sports",
    noun: "Sports Coach",
    blurb: "Technique, conditioning and competitive mindset.",
  },
  {
    slug: "startup-founder",
    label: "Startup & Founder",
    noun: "Startup & Founder Coach",
    blurb: "Product, fundraising, co-founders and pace.",
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

/** "Business Coach" - a factual descriptor, never a quality claim. */
export function categoryNoun(slug: string): string {
  return getCategory(slug)?.noun ?? "Coach";
}
