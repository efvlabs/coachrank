import { validSocialUrl } from "./social";

export const QOTD_SIZE = { width: 1080, height: 1350 };
export const QOTD_LAYOUT = { background: "#2c4bf0", ink: "#ffffff", margin: 72, logoWidth: 220, footerColumnGap: 48, attributionGap: 14, quoteTop: 255, quoteHeight: 790 } as const;
export const QOTD_QUOTE_LIMIT = 700;
export type QotdInput = {
  id: string;
  quote: string;
  author: string;
  role: string;
  date: string;
  sourceUrl: string;
  archived: boolean;
  revision: number;
};
export type QotdRecord = QotdInput & { createdAtMs: number; updatedAtMs: number };
export const QOTD_EXAMPLE = {
  quote: "Greatness is built in the work you choose to repeat.",
  author: "CoachRank",
  role: "An original perspective",
  date: "",
};
export type QotdArtwork = Pick<QotdInput, "quote" | "author" | "role" | "date">;

export function emptyQotd(id: string, date: string): QotdInput {
  return { id, quote: "", author: "", role: "", date, sourceUrl: "", archived: false, revision: 0 };
}

export function validateQotd(raw: unknown): QotdInput {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Add your quote first.");
  const value = raw as Record<string, unknown>;
  const result = emptyQotd("", "");
  for (const [key, limit] of Object.entries({ id: 80, quote: QOTD_QUOTE_LIMIT, author: 90, role: 100, date: 10, sourceUrl: 2000 })) {
    if (typeof value[key] !== "string" || (value[key] as string).length > limit) throw new Error(`Check ${key}: the field is missing or too long.`);
    const text = (value[key] as string).trim().replace(/\r\n?/g, "\n");
    if (text.includes(String.fromCodePoint(0x2014))) throw new Error("Use periods, commas or colons instead of long dashes.");
    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text)) throw new Error("Remove hidden control characters from the text.");
    (result as unknown as Record<string, unknown>)[key] = text;
  }
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(result.id)) throw new Error("Invalid quote ID. Create a new card.");
  if (!result.quote) throw new Error("Add the words you want to share.");
  if (result.role && !result.author) throw new Error("Add a name for this role, or leave both fields empty.");
  if (result.date && (!/^\d{4}-\d{2}-\d{2}$/.test(result.date) || !Number.isFinite(Date.parse(result.date)) || new Date(result.date).toISOString().slice(0, 10) !== result.date)) throw new Error("Choose a valid calendar date.");
  if (result.sourceUrl && !validSocialUrl(result.sourceUrl)) throw new Error("The source needs a full HTTPS link.");
  if (typeof value.archived !== "boolean" || !Number.isSafeInteger(value.revision) || (value.revision as number) < 0) throw new Error("Invalid quote version. Reload the desk and try again.");
  result.archived = value.archived;
  result.revision = value.revision as number;
  return result;
}

export function qotdCaption(item: QotdArtwork) {
  return `${item.quote}${item.author ? `\n\n${item.author}${item.role ? ` · ${item.role}` : ""}` : ""}\n\n#QuoteOfTheDay`;
}

export function qotdFilename(item: QotdArtwork) {
  const name = (item.author || "quote").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "quote";
  return `coachrank-qotd-${item.date || "undated"}-${name}.png`;
}

type MeasureText = (text: string, size: number) => number;
/** Preserve deliberate line breaks and split long words without cutting a grapheme. */
export function wrapQuote(text: string, size: number, width: number, measure: MeasureText): string[] {
  const result: string[] = [];
  const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
  for (const paragraph of text.replace(/\r\n?/g, "\n").split("\n")) {
    if (!paragraph.trim()) { result.push(""); continue; }
    let line = "";
    for (const word of paragraph.trim().split(/\s+/)) {
      const joined = line ? `${line} ${word}` : word;
      if (measure(joined, size) <= width) { line = joined; continue; }
      if (line) { result.push(line); line = ""; }
      for (const { segment } of segmenter.segment(word)) {
        if (line && measure(line + segment, size) > width) { result.push(line); line = ""; }
        line += segment;
      }
    }
    if (line) result.push(line);
  }
  return result;
}

export function fitQuote(text: string, measure: MeasureText, width = 936, height = 790, maxSize = 108, minSize = 42) {
  for (let size = maxSize; size >= minSize; size -= 2) {
    const lines = wrapQuote(text, size, width, measure);
    const lineHeight = size * 1.15;
    const fits = lines.length * lineHeight <= height && lines.every(line => measure(line, size) <= width);
    if (fits || size === minSize) return { lines, size, lineHeight, fits };
  }
  throw new Error("Invalid type size range.");
}
