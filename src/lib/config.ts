import { dollarsToCents } from "./money";

/**
 * Build-time defaults. Every pricing knob here is overridable at runtime from the
 * `settings/pricing` Firestore document, which the admin UI edits. See lib/domain/settings.
 */
function envDollarsToCents(key: string, fallbackDollars: number): number {
  const raw = process.env[key];
  const parsed = raw === undefined ? NaN : Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? dollarsToCents(parsed) : dollarsToCents(fallbackDollars);
}

export const PRICING_DEFAULTS = {
  minNewBidCents: envDollarsToCents("DEFAULT_MIN_NEW_BID_USD", 5),
  maxBidCents: envDollarsToCents("DEFAULT_MAX_BID_USD", 999_999),
  topPositionIncrementCents: envDollarsToCents("DEFAULT_TOP_POSITION_INCREMENT_USD", 5),
  standardIncrementCents: envDollarsToCents("DEFAULT_STANDARD_INCREMENT_USD", 5),
  premiumSpotlightCents: envDollarsToCents("DEFAULT_PREMIUM_SPOTLIGHT_USD", 99),
  standardSpotlightCents: envDollarsToCents("DEFAULT_STANDARD_SPOTLIGHT_USD", 99),
} as const;

export type Pricing = { -readonly [K in keyof typeof PRICING_DEFAULTS]: number };

export const SITE = {
  name: "CoachRank.lol",
  shortName: "CoachRank",
  tagline: "Coaches who back themselves.",
  /**
   * The <title>, and the blue line in a search result. Client-facing verb, because the
   * people search engines send here are looking for a coach, not selling coaching.
   *
   * Deliberately not "find better coaches": the Terms say a position is not our opinion
   * of a coach and that we verify nothing, and a headline that promises curation would
   * make a liar of every other page on the site.
   */
  title: "CoachRank - Find coaches who back themselves",
  /** Link previews stay on the tagline; it is a hook, not an explanation. */
  description: "Coaches who back themselves.",
  /**
   * The grey line under a search result. Google writes its own when ours is too thin to
   * be useful - which is how a snippet ends up reading "$99 for 24 hours. The amount is
   * the entire". Long enough to answer "what is this and why would I click".
   */
  searchDescription:
    "Every ranking here was paid for, and we show you exactly how much. No reviews, no algorithm, no editorial picks - browse coaches by category and judge for yourself.",
  url: (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, ""),
  twitter: "@coachranklol",
  contactEmail: "contact@coachrank.lol",
  socials: [
    { label: "X", href: "https://x.com/coachranklol" },
    { label: "Instagram", href: "https://www.instagram.com/coachranklol/" },
  ],
} as const;

export function absoluteUrl(path: string): string {
  return `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Spotlight rentals last exactly 24 hours from the moment payment is verified. */
export const SPOTLIGHT_DURATION_MS = 24 * 60 * 60 * 1000;

/** A payment counts toward the Today board for exactly 24 hours after it succeeded. */
export const TODAY_WINDOW_MS = 24 * 60 * 60 * 1000;

/** How long a spotlight slot is held while a buyer completes checkout. */
export const SPOTLIGHT_HOLD_MS = 15 * 60 * 1000;

/** A visitor counts as "online" if we heard a heartbeat within this window. */
export const PRESENCE_WINDOW_MS = 75 * 1000;
export const PRESENCE_HEARTBEAT_MS = 45 * 1000;

export const LEADERBOARD_PAGE_SIZE = 50;

export const CLICK_SOURCES = [
  "leaderboard",
  "category",
  "today",
  "premium_spotlight",
  "standard_spotlight",
  "rank_page",
  "blog",
] as const;

export type ClickSource = (typeof CLICK_SOURCES)[number];

export function isClickSource(value: unknown): value is ClickSource {
  return typeof value === "string" && (CLICK_SOURCES as readonly string[]).includes(value);
}

export const ADMIN_EMAILS: string[] = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

export const PRESENCE_ENABLED = process.env.NEXT_PUBLIC_ENABLE_PRESENCE !== "false";

/**
 * The blog is built and editable in /admin, but hidden from the public site until it is
 * switched on. Nothing links to it, it is out of the sitemap, and the routes 404.
 */
export const BLOG_ENABLED = process.env.NEXT_PUBLIC_ENABLE_BLOG === "true";
