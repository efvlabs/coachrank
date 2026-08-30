/**
 * Regenerates every exported brand asset from the single geometry in src/lib/brand.ts.
 *
 * Run it after changing the mark so the favicon, the touch icon and the social avatars
 * cannot drift apart from what the site renders:
 *
 *   node scripts/generate-brand.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const LOGO_BG = "#2C4BF0";
const LOGO_FG = "#FFFFFF";
const LOGO_BG_DARK = "#12141A";
const LOGO_FG_DARK = "#A8BAFF";

// Kept in step with src/lib/brand.ts. [x, y, width, height, opacity] on a 32-unit grid.
const PODIUM = [
  [4.5, 15, 7.5, 12.5, 0.55],
  [12.8, 8, 7.5, 19.5, 1],
  [21.1, 18.5, 7.5, 9, 0.55],
];
const RADIUS = 2;

const round = (v) => Number(v.toFixed(3));

function rects(scale, fill) {
  return PODIUM.map(
    ([x, y, w, h, o]) =>
      `<rect x="${round(x * scale)}" y="${round(y * scale)}" width="${round(w * scale)}" height="${round(h * scale)}" rx="${round(RADIUS * scale)}" fill="${fill}"${o < 1 ? ` opacity="${o}"` : ""}/>`,
  ).join("\n  ");
}

function tile({ size, bg, fg, label = "CoachRank" }) {
  const scale = size / 32;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" role="img" aria-label="${label}">
  <rect width="${size}" height="${size}" rx="${round(size * 0.25)}" fill="${bg}"/>
  ${rects(scale, fg)}
</svg>`;
}

const root = process.cwd();
const brand = join(root, "public", "brand");
mkdirSync(brand, { recursive: true });

// --- The favicon the app serves -------------------------------------------------------
writeFileSync(join(root, "src", "app", "icon.svg"), tile({ size: 32, bg: LOGO_BG, fg: LOGO_FG }) + "\n");

// --- Exported brand files -------------------------------------------------------------
writeFileSync(join(brand, "avatar.svg"), tile({ size: 1024, bg: LOGO_BG, fg: LOGO_FG }) + "\n");
writeFileSync(
  join(brand, "avatar-dark.svg"),
  tile({ size: 1024, bg: LOGO_BG_DARK, fg: LOGO_FG_DARK }) + "\n",
);

// The bare mark, for anywhere that supplies its own colour and background.
writeFileSync(
  join(brand, "mark.svg"),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" role="img" aria-label="CoachRank">
  ${rects(1, "currentColor")}
</svg>\n`,
);

// The wordmark: tile at 56px on a 320x64 canvas, with the name set beside it.
// Two files rather than one currentColor file, because a wordmark is mostly used as an
// image - and inside an <img> currentColor resolves to black on any background.
const wm = 56 / 32;
const wordmark = (ink) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 64" fill="none" role="img" aria-label="CoachRank">
  <rect y="4" width="56" height="56" rx="14" fill="${LOGO_BG}"/>
  <g transform="translate(0 4)">
    ${rects(wm, LOGO_FG)}
  </g>
  <text x="74" y="41" font-family="system-ui,-apple-system,Segoe UI,Roboto,sans-serif" font-size="30" font-weight="700" fill="${ink}">CoachRank</text>
</svg>\n`;

writeFileSync(join(brand, "wordmark.svg"), wordmark("#101218"));
writeFileSync(join(brand, "wordmark-dark.svg"), wordmark("#F2F3F6"));

// --- Rasters --------------------------------------------------------------------------
const png = (svg, size) => sharp(Buffer.from(svg)).resize(size, size).png({ quality: 92 }).toBuffer();

const light1024 = tile({ size: 1024, bg: LOGO_BG, fg: LOGO_FG });
const dark1024 = tile({ size: 1024, bg: LOGO_BG_DARK, fg: LOGO_FG_DARK });

writeFileSync(join(brand, "avatar-1024.png"), await png(light1024, 1024));
writeFileSync(join(brand, "avatar-512.png"), await png(light1024, 512));
writeFileSync(join(brand, "avatar-dark-1024.png"), await png(dark1024, 1024));

// Apple wants no transparency and its own rounding, so this one is a full-bleed square.
const appleSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180" fill="none">
  <rect width="180" height="180" fill="${LOGO_BG}"/>
  ${rects(180 / 32, LOGO_FG)}
</svg>`;
writeFileSync(join(root, "src", "app", "apple-icon.png"), await png(appleSvg, 180));

console.log("Regenerated from one geometry:");
for (const f of [
  "src/app/icon.svg",
  "src/app/apple-icon.png",
  "public/brand/avatar.svg",
  "public/brand/avatar-dark.svg",
  "public/brand/mark.svg",
  "public/brand/wordmark.svg",
  "public/brand/wordmark-dark.svg",
  "public/brand/avatar-1024.png",
  "public/brand/avatar-512.png",
  "public/brand/avatar-dark-1024.png",
]) console.log("  " + f);
