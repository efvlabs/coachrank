/** Original vector covers for three practical CoachRank guides. */
import { mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const directory = "public/editorial/edition-03";
mkdirSync(directory, { recursive: true });
const box = (x, y, w, h, fill, radius = 18) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}"/>`;
const path = (d, color, width = 16) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
const dot = (x, y, r, color) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}"/>`;
const blue = "url(#blue)", orange = "url(#orange)", paper = "#fffaf2";
const covers = [
  {
    slug: "brand-positioning-statement-examples", dark: false,
    shapes: path("M230 280H525L820 512H1130M230 512H1130M230 744H525L820 512", "#2c4bf0", 46)
      + [280, 512, 744].map(y => box(190, y - 65, 130, 130, blue, 24)).join("")
      + `<rect x="805" y="247" width="460" height="530" rx="35" fill="${paper}" stroke="#2c4bf0" stroke-width="7"/>`
      + path("M900 362H860V422M1170 422V362H1110M860 602V662H920M1110 662H1170V602", "#bdcaff", 12)
      + dot(1015, 512, 105, orange) + dot(1015, 512, 25, paper),
  },
  {
    slug: "brand-audit-checklist-small-business", dark: true,
    shapes: path("M335 337H768H1201V687H768H335Z", "#5b77e8", 6)
      + [337, 687].flatMap(y => [335, 768, 1201].map(x => box(x - 85, y - 85, 170, 170, blue, 26) + path(`M${x - 38} ${y - 22}H${x + 38}M${x - 38} ${y + 13}H${x + 14}`, "#bdcaff", 9))).join("")
      + `<circle cx="768" cy="687" r="141" fill="#ff8b3210" stroke="url(#orange)" stroke-width="34"/>`
      + path("M872 794L967 888", "#ff983f", 34)
      + dot(768, 687, 37, orange) + path("M750 686L764 700L790 670", paper, 8),
  },
  {
    slug: "task-prioritization-for-solopreneurs", dark: false,
    shapes: box(226, 212, 860, 596, blue, 36) + box(260, 246, 792, 528, paper, 18)
      + box(296, 282, 720, 148, orange) + box(296, 448, 435, 135, blue) + box(296, 601, 260, 135, blue)
      + path("M584 671H1009", "#b9c6fa", 3)
      + [785, 845, 905, 965].map(x => dot(x, 516, 7, "#b9c6fa")).join("")
      + `<g transform="rotate(9 1226 325)">${box(1158, 242, 137, 166, "#bdcaff")}</g>`
      + `<g transform="rotate(-8 1230 584)">${box(1160, 474, 137, 220, "#d5dcf4")}</g>`
      + path("M226 875H1086M226 855V895M1086 855V895", "#263e7f", 4),
  },
];
for (const { slug, dark, shapes } of covers) {
  const bg = dark ? "#0b1843" : "#f3efe6";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1024" viewBox="0 0 1536 1024"><defs><linearGradient id="blue" x2=".7" y2="1"><stop stop-color="#526eff"/><stop offset="1" stop-color="#1736b9"/></linearGradient><linearGradient id="orange" x2=".9" y2="1"><stop stop-color="#ffc17b"/><stop offset="1" stop-color="#f27822"/></linearGradient><pattern id="grid" width="64" height="64" patternUnits="userSpaceOnUse"><path d="M64 0H0V64" fill="none" stroke="${dark ? "#b1c0ff" : "#24417e"}" stroke-width=".6" opacity=".16"/></pattern><filter id="shadow" x="-25%" y="-25%" width="160%" height="170%"><feDropShadow dx="10" dy="21" stdDeviation="15" flood-color="#07163c" flood-opacity=".15"/></filter></defs>${box(0, 0, 1536, 1024, bg, 0)}${box(0, 0, 1536, 1024, "url(#grid)", 0)}<g filter="url(#shadow)">${shapes}</g></svg>`;
  writeFileSync(`${directory}/${slug}.svg`, svg);
  await sharp(Buffer.from(svg)).webp({ quality: 88 }).toFile(`${directory}/${slug}.webp`);
  console.log(`Created ${slug}`);
}
