import { WORDMARK } from "./brand-wordmark";

export const LOGO_BG = "#2C4BF0";
export const LOGO_FG = "#FFFFFF";
/** Outlined lettering for SVG badges and exported artwork. */
export function wordmarkPaths(ink: string, accent: string) {
  return WORDMARK.paths.map(path => `<path d="${path.d}" transform="translate(${path.x} ${WORDMARK.baseline}) scale(1 -1)" fill="${path.dot ? accent : ink}"/>`).join("");
}
export { WORDMARK };
