export const MAX_BIO_WORDS = 30;
export const MAX_BIO_CHARS = 400;

/** Words are whitespace-delimited runs. Used identically on the client and the server. */
export function countWords(text: string): number {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export type BioRejectionReason = "empty" | "too_many_words" | "too_long" | "markup";

/** Replace C0/C1 control characters with a space so they cannot hide inside a bio. */
function stripControlChars(input: string): string {
  let out = "";
  for (const ch of input) {
    const code = ch.codePointAt(0) ?? 0;
    out += code < 0x20 || (code >= 0x7f && code <= 0x9f) ? " " : ch;
  }
  return out;
}

/**
 * Bios are stored and rendered as plain text. We strip control characters and collapse
 * whitespace, and reject anything containing markup so nothing can smuggle HTML through.
 */
export function validateBio(
  input: string | null | undefined,
): { ok: true; value: string; words: number } | { ok: false; reason: BioRejectionReason } {
  const raw = stripControlChars(input ?? "")
    .replace(/\s+/g, " ")
    .trim();

  if (!raw) return { ok: false, reason: "empty" };
  if (raw.length > MAX_BIO_CHARS) return { ok: false, reason: "too_long" };
  if (/[<>]/.test(raw) || /&(?:#\d+|#x[0-9a-f]+|[a-z]+);/i.test(raw)) {
    return { ok: false, reason: "markup" };
  }

  const words = countWords(raw);
  if (words > MAX_BIO_WORDS) return { ok: false, reason: "too_many_words" };

  return { ok: true, value: raw, words };
}

export const BIO_REJECTION_MESSAGE: Record<BioRejectionReason, string> = {
  empty: "Add a short bio.",
  too_many_words: `Keep it to ${MAX_BIO_WORDS} words or fewer.`,
  too_long: "That bio is too long.",
  markup: "Plain text only - no HTML or angle brackets.",
};
