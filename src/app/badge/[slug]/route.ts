import { categoryLabel } from "@/lib/categories";
import { computeRanks, getListingBySlug } from "@/lib/domain/listings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The rank badge a coach puts on their own site.
 *
 * SVG rather than an image so it stays sharp anywhere and weighs nothing, and drawn with
 * generic font families because a cross-origin <img> cannot load webfonts - the badge
 * renders in whatever the visitor's own UI font is, which is why the layout is measured
 * rather than fixed.
 */

const THEMES = {
  dark: { bg: "#12141a", border: "#262a33", ink: "#ffffff", muted: "#9aa0b0", accent: "#a8baff" },
  light: { bg: "#ffffff", border: "#e8e6e3", ink: "#101218", muted: "#666b78", accent: "#2c4bf0" },
} as const;

/** Rough advance width for a system sans-serif. Good enough to avoid clipping or slack. */
function textWidth(text: string, size: number, bold = false): number {
  return Math.ceil(text.length * size * (bold ? 0.6 : 0.55));
}

function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c] as string,
  );
}

function svg(rank: string | null, category: string | null, theme: keyof typeof THEMES): string {
  const t = THEMES[theme];
  const H = 40;
  const wordmark = "CoachRank";

  const padL = 12;
  const bars = 15;
  const gapAfterBars = 8;
  const wordmarkW = textWidth(wordmark, 13.5, true);
  const rankW = rank ? textWidth(rank, 15, true) : 0;
  const catW = category ? textWidth(category, 11.5) : 0;
  const dividerGap = rank ? 11 : 0;
  const padR = 13;

  const width =
    padL + bars + gapAfterBars + wordmarkW + (rank ? dividerGap * 2 + 1 + rankW : 0) +
    (category ? 7 + catW : 0) + padR;

  const barsX = padL;
  const wordX = barsX + bars + gapAfterBars;
  const divX = wordX + wordmarkW + dividerGap;
  const rankX = divX + dividerGap;
  const catX = rankX + rankW + 7;

  const label = rank
    ? `CoachRank ${rank}${category ? ` in ${category}` : ""}`
    : "CoachRank";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${H}" viewBox="0 0 ${width} ${H}" role="img" aria-label="${escapeXml(label)}">
  <title>${escapeXml(label)}</title>
  <rect x="0.5" y="0.5" width="${width - 1}" height="${H - 1}" rx="${H / 2}" fill="${t.bg}" stroke="${t.border}"/>
  <g fill="${t.accent}">
    <rect x="${barsX}" y="21" width="3.5" height="7" rx="1.4"/>
    <rect x="${barsX + 5.5}" y="16" width="3.5" height="12" rx="1.4"/>
    <rect x="${barsX + 11}" y="12" width="3.5" height="16" rx="1.4"/>
  </g>
  <text x="${wordX}" y="${H / 2 + 4.5}" font-family="system-ui,-apple-system,Segoe UI,Roboto,sans-serif" font-size="13.5" font-weight="700" fill="${t.ink}">${escapeXml(wordmark)}</text>
  ${rank ? `<line x1="${divX}" y1="11" x2="${divX}" y2="${H - 11}" stroke="${t.border}" stroke-width="1"/>
  <text x="${rankX}" y="${H / 2 + 5}" font-family="system-ui,-apple-system,Segoe UI,Roboto,sans-serif" font-size="15" font-weight="800" fill="${t.accent}">${escapeXml(rank)}</text>` : ""}
  ${category ? `<text x="${catX}" y="${H / 2 + 4}" font-family="system-ui,-apple-system,Segoe UI,Roboto,sans-serif" font-size="11.5" font-weight="500" fill="${t.muted}">${escapeXml(category)}</text>` : ""}
</svg>`;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const url = new URL(request.url);
  const theme: keyof typeof THEMES = url.searchParams.get("theme") === "light" ? "light" : "dark";
  const scope = url.searchParams.get("scope") === "category" ? "category" : "overall";

  const listing = await getListingBySlug(slug);

  // A hidden or unpaid listing gets a plain wordmark rather than a broken image: their
  // page keeps working, and we stop repeating a rank they no longer hold.
  let rank: string | null = null;
  let label: string | null = null;
  if (listing && listing.status === "active") {
    const ranks = await computeRanks(listing);
    rank = `#${scope === "category" ? ranks.categoryRank : ranks.overallRank}`;
    label = scope === "category" ? categoryLabel(listing.category) : null;
  }

  return new Response(svg(rank, label, theme), {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      // Ranks move when someone pays, so the badge is fresh within minutes, not seconds.
      "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
