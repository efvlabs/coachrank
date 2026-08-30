export const MAX_BIO_CHARS = 1000;

/** Words are whitespace-delimited runs. Used identically on the client and the server. */
export function countWords(text: string): number {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export type BioRejectionReason = "empty" | "too_long" | "markup";

/** Replace C0/C1 control characters with a space so they cannot hide inside a bio. */
function stripControlChars(input: string): string {
  let out = "";
  for (const ch of input) {
    const code = ch.codePointAt(0) ?? 0;
    const control = (code < 0x20 && ch !== "\n") || (code >= 0x7f && code <= 0x9f);
    out += control ? " " : ch;
  }
  return out;
}

/**
 * Bios are plain text, deliberately.
 *
 * A coach filling in a form on their phone will not write markdown, bold adds nothing to
 * what a search engine indexes, and an open link field on a site with any PageRank is the
 * first thing an SEO spammer looks for. Paragraph breaks are the one bit of structure a
 * bio actually needs, so they survive and nothing else does.
 *
 * Angle brackets are refused outright, which means no HTML reaches a renderer at all -
 * cheaper to be certain of than any allowlist.
 */
export function validateBio(
  input: string | null | undefined,
): { ok: true; value: string; words: number } | { ok: false; reason: BioRejectionReason } {
  const raw = stripControlChars(input ?? "")
    // Collapse runs of spaces and tabs, but keep paragraph breaks.
    .replace(/[^\S\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!raw) return { ok: false, reason: "empty" };
  if (raw.length > MAX_BIO_CHARS) return { ok: false, reason: "too_long" };
  if (/[<>]/.test(raw) || /&(?:#\d+|#x[0-9a-f]+|[a-z]+);/i.test(raw)) {
    return { ok: false, reason: "markup" };
  }

  return { ok: true, value: raw, words: countWords(raw) };
}

export const BIO_REJECTION_MESSAGE: Record<BioRejectionReason, string> = {
  empty: "Add a short bio.",
  too_long: `Keep it to ${MAX_BIO_CHARS} characters or fewer.`,
  markup: "Plain text only - no HTML or angle brackets.",
};

/**
 * A validated bio, split for rendering. Paragraphs only - React escapes the text like any
 * other string, so there is nothing here that can become markup.
 */
export function bioParagraphs(bio: string): string[] {
  return (bio ?? "")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}
