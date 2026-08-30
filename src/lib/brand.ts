/**
 * The mark, in one place.
 *
 * A podium: three blocks with the tallest in the middle, which is what a podium is and
 * what a bar chart never is. Ascending bars read as analytics, and the two faded ones
 * disappeared at favicon size - the shape is asymmetric now so it stays identifiable at
 * 16px, and centre-weighted so a circular avatar crop does not leave a wedge of empty
 * tile in one corner.
 *
 * Every asset is generated from these numbers - the favicon, the header, the badge, the
 * social avatars - so the picture cannot drift between them.
 */

/** The tile and the bars are fixed colours in both themes: one picture everywhere. */
export const LOGO_BG = "#2C4BF0";
export const LOGO_FG = "#FFFFFF";

/** The dark-tile variant, for a light surface that needs the mark to recede. */
export const LOGO_BG_DARK = "#12141A";
export const LOGO_FG_DARK = "#A8BAFF";

/** Podium blocks on a 32-unit grid: [x, y, width, height, opacity]. */
export const PODIUM: readonly (readonly [number, number, number, number, number])[] = [
  [4.5, 15, 7.5, 12.5, 0.55],
  [12.8, 8, 7.5, 19.5, 1],
  [21.1, 18.5, 7.5, 9, 0.55],
] as const;

/** Corner radius of a podium block, on the same 32-unit grid. */
export const PODIUM_RADIUS = 2;

/** The blocks as SVG markup, scaled from the 32-unit grid to any canvas. */
export function podiumRects(options: {
  scale?: number;
  fill?: string;
  radius?: number;
} = {}): string {
  const scale = options.scale ?? 1;
  const fill = options.fill ?? LOGO_FG;
  const radius = (options.radius ?? PODIUM_RADIUS) * scale;
  const n = (value: number) => Number((value * scale).toFixed(3));

  return PODIUM.map(
    ([x, y, w, h, opacity]) =>
      `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${Number(radius.toFixed(3))}" fill="${fill}"${
        opacity < 1 ? ` opacity="${opacity}"` : ""
      }/>`,
  ).join("");
}

/** The whole mark: tile plus podium, at any size. */
export function markSvg(options: {
  size?: number;
  bg?: string;
  fg?: string;
  /** "tile" for the rounded square, "circle" for a social avatar. */
  shape?: "tile" | "circle";
  attrs?: string;
} = {}): string {
  const size = options.size ?? 32;
  const bg = options.bg ?? LOGO_BG;
  const fg = options.fg ?? LOGO_FG;
  const scale = size / 32;
  const radius = options.shape === "circle" ? size / 2 : size * 0.25;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none"${
    options.attrs ? ` ${options.attrs}` : ""
  }><rect width="${size}" height="${size}" rx="${Number(radius.toFixed(3))}" fill="${bg}"/>${podiumRects(
    { scale, fill: fg },
  )}</svg>`;
}
