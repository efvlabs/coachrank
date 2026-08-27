/**
 * Cheap, deterministic screening applied at submission time. It is not a content-safety
 * system - it rejects the obviously-not-a-coach-website cases and hands everything else
 * to the human moderation path in /admin.
 */

const BLOCKED_HOST_SUFFIXES = [
  "pornhub.com", "xvideos.com", "xnxx.com", "onlyfans.com", "redtube.com", "xhamster.com",
  "chaturbate.com", "stripchat.com", "adultfriendfinder.com", "fansly.com", "youporn.com",
];

const BLOCKED_HOST_KEYWORDS = ["porn", "xxx", "escort", "camgirl", "sexcam", "nudes"];

/** Free hosts and social profiles are not a coach's own site; they invite impersonation. */
const DISALLOWED_HOSTS = new Set([
  "facebook.com", "instagram.com", "x.com", "twitter.com", "tiktok.com", "youtube.com",
  "linkedin.com", "reddit.com", "medium.com", "substack.com", "google.com", "docs.google.com",
  "drive.google.com", "notion.so", "notion.site", "calendly.com", "wa.me", "t.me",
]);

const SPAM_BIO_PATTERNS = [
  /\bfree\s+(crypto|bitcoin|money|forex)\b/i,
  /\bguarantee[d]?\s+(returns?|profits?|income)\b/i,
  /\b(viagra|casino|betting|payday\s+loan)\b/i,
  /\bclick\s+here\b/i,
  /https?:\/\//i,
];

/** Superlatives we refuse to publish - the rank is paid, and the copy must not imply otherwise. */
const QUALITY_CLAIM_PATTERNS = [
  /\b(?:the\s+)?(?:world'?s\s+|uk'?s\s+|nation'?s\s+)?(?:#?\s*1|number\s+one|best|top[- ]rated|most\s+trusted|leading|award[- ]winning)\b/i,
];

export type ModerationReason =
  | "blocked_site"
  | "not_own_site"
  | "spam_bio"
  | "quality_claim";

export const MODERATION_MESSAGE: Record<ModerationReason, string> = {
  blocked_site: "That website can't be listed on CoachRank.",
  not_own_site:
    "Link your own website, not a social or document profile. CoachRank sends visitors straight to your site.",
  spam_bio: "That bio looks like spam. Describe what you actually help people with.",
  quality_claim:
    "Rank here is paid, so bios can't claim to be the best, #1 or top-rated. Say what you do instead.",
};

export function screenWebsite(host: string): ModerationReason | null {
  const h = host.toLowerCase();
  if (BLOCKED_HOST_SUFFIXES.some((s) => h === s || h.endsWith(`.${s}`))) return "blocked_site";
  if (BLOCKED_HOST_KEYWORDS.some((k) => h.includes(k))) return "blocked_site";
  if (DISALLOWED_HOSTS.has(h)) return "not_own_site";
  return null;
}

export function screenBio(bio: string): ModerationReason | null {
  if (SPAM_BIO_PATTERNS.some((p) => p.test(bio))) return "spam_bio";
  if (QUALITY_CLAIM_PATTERNS.some((p) => p.test(bio))) return "quality_claim";
  return null;
}

export type NameRejectionReason = "empty" | "too_long" | "markup";

export function validateName(
  input: string | null | undefined,
): { ok: true; value: string } | { ok: false; reason: NameRejectionReason } {
  const raw = (input ?? "").replace(/\s+/g, " ").trim();
  if (!raw) return { ok: false, reason: "empty" };
  if (raw.length > 60) return { ok: false, reason: "too_long" };
  if (/[<>]/.test(raw)) return { ok: false, reason: "markup" };
  return { ok: true, value: raw };
}

export const NAME_MESSAGE: Record<NameRejectionReason, string> = {
  empty: "Add your name.",
  too_long: "That name is too long.",
  markup: "Plain text only.",
};
