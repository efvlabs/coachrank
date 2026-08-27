import type { CategorySlug } from "@/lib/categories";

/**
 * One mark per category, drawn from the thing the category is about rather than from a
 * generic icon set: a compass for Life, a target for Performance, interlocking rings for
 * Relationship. They read at 14px, inherit currentColor, and carry no meaning of their
 * own - the label is always beside them, so they are decoration for scanning speed.
 */
const PATHS: Record<CategorySlug | "all", React.ReactNode> = {
  all: (
    <>
      <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />
    </>
  ),
  business: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2.5" />
      <path d="M8.5 7V5.5A2 2 0 0 1 10.5 3.5h3a2 2 0 0 1 2 2V7" />
      <path d="M3 12.5h18" />
    </>
  ),
  career: (
    <>
      <path d="M3 17.5l6-6 4 4 8-8" />
      <path d="M15 7.5h6v6" />
    </>
  ),
  executive: (
    <>
      <path d="M4 21V5.5A2 2 0 0 1 6 3.5h6a2 2 0 0 1 2 2V21" />
      <path d="M14 10.5h4a2 2 0 0 1 2 2V21" />
      <path d="M7.5 8h3M7.5 12h3M7.5 16h3" />
      <path d="M2.5 21h19" />
    </>
  ),
  financial: (
    <>
      <ellipse cx="12" cy="6" rx="7.5" ry="3" />
      <path d="M4.5 6v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V6" />
      <path d="M4.5 12v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6" />
    </>
  ),
  "health-wellness": (
    <path d="M12 20.5S3.5 15.5 3.5 9.5a4.5 4.5 0 0 1 8.5-2 4.5 4.5 0 0 1 8.5 2c0 6-8.5 11-8.5 11z" />
  ),
  leadership: (
    <>
      <circle cx="9" cy="7.5" r="3.5" />
      <path d="M2.5 20.5v-1.5a5 5 0 0 1 5-5h3a5 5 0 0 1 5 5v1.5" />
      <path d="M16.5 4.3a3.5 3.5 0 0 1 0 6.4" />
      <path d="M18 14.2a5 5 0 0 1 3.5 4.8v1.5" />
    </>
  ),
  life: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M15.5 8.5l-2.2 5-5 2.2 2.2-5z" />
    </>
  ),
  parenting: (
    <>
      <circle cx="8" cy="6" r="3" />
      <path d="M3 20.5v-1a5 5 0 0 1 5-5 5 5 0 0 1 5 5v1" />
      <circle cx="17" cy="11.5" r="2.2" />
      <path d="M13.6 20.5v-.5a3.4 3.4 0 0 1 3.4-3.4 3.4 3.4 0 0 1 3.4 3.4v.5" />
    </>
  ),
  performance: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  relationship: (
    <>
      <circle cx="8.8" cy="12" r="5.5" />
      <circle cx="15.2" cy="12" r="5.5" />
    </>
  ),
  sales: (
    <>
      <path d="M3 10.5v3a1 1 0 0 0 1 1h2l5 3.5v-12L6 9.5H4a1 1 0 0 0-1 1z" />
      <path d="M15.5 9.2a4 4 0 0 1 0 5.6" />
      <path d="M18.3 6.4a8 8 0 0 1 0 11.2" />
    </>
  ),
  "spiritual-mindfulness": (
    <>
      <path d="M12 19.5s-4.5-2.6-4.5-6.8c0-3 2-5.8 4.5-7.7 2.5 1.9 4.5 4.7 4.5 7.7 0 4.2-4.5 6.8-4.5 6.8z" />
      <path d="M7.6 12.6c-2 0-3.8 1-3.8 2.6 0 2.3 3.7 4.1 8.2 4.1s8.2-1.8 8.2-4.1c0-1.6-1.8-2.6-3.8-2.6" />
    </>
  ),
  // A whistle: the coach's own instrument, and it survives 15px where a medal's
  // ribbons collapse into a smudge.
  sports: (
    <>
      <circle cx="9.5" cy="13.8" r="5.6" />
      <circle cx="9.5" cy="13.8" r="1.5" />
      <path d="M14.3 10.9l4.6-2.7a1.7 1.7 0 1 1 1.7 2.9l-3.3 1.9" />
    </>
  ),
  "startup-founder": (
    <>
      <path d="M12 2.5s4.6 3.2 4.6 8.8c0 2.7-1.2 5-2.2 6.2H9.6c-1-1.2-2.2-3.5-2.2-6.2C7.4 5.7 12 2.5 12 2.5z" />
      <circle cx="12" cy="9.8" r="1.7" />
      <path d="M7.4 12.4L4.6 15.6v3.1l2.9-1.9" />
      <path d="M16.6 12.4l2.8 3.2v3.1l-2.9-1.9" />
    </>
  ),
};

type Props = { slug: CategorySlug | "all"; className?: string };

export function CategoryIcon({ slug, className = "" }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`h-[15px] w-[15px] shrink-0 ${className}`}
    >
      {PATHS[slug]}
    </svg>
  );
}
