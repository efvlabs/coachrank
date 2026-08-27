import { initials } from "./format";

/**
 * We never ask a coach to upload anything. The board's icon for a listing is derived from
 * their website, and falls back to a generated initials avatar - both served through our
 * own /api/icon route so the <img> always resolves and there is no client-side fallback JS.
 */
export function iconUrl(host: string, name: string, size = 64): string {
  const params = new URLSearchParams({
    host,
    n: initials(name),
    s: String(size),
  });
  return `/api/icon?${params.toString()}`;
}

/** Deterministic hue per host so an initials avatar keeps the same colour everywhere. */
export function avatarHue(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 360;
  }
  return hash;
}

export function initialsSvg(text: string, seed: string, size: number): string {
  const hue = avatarHue(seed);
  const safe = text.replace(/[<>&"']/g, "").slice(0, 2).toUpperCase() || "?";
  const fontSize = Math.round(size * (safe.length > 1 ? 0.38 : 0.46));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="${safe}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="hsl(${hue} 68% 62%)"/>
    <stop offset="100%" stop-color="hsl(${(hue + 38) % 360} 72% 48%)"/>
  </linearGradient></defs>
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.24)}" fill="url(#g)"/>
  <text x="50%" y="50%" dy="0.02em" dominant-baseline="central" text-anchor="middle"
        font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-weight="700"
        font-size="${fontSize}" fill="#ffffff" letter-spacing="0.02em">${safe}</text>
</svg>`;
}

/** Public favicon services, tried in order. Configurable so it can be swapped or disabled. */
export function faviconSources(host: string, size: number): string[] {
  if (process.env.DISABLE_REMOTE_FAVICONS === "true") return [];
  const encoded = encodeURIComponent(host);
  return [
    `https://icons.duckduckgo.com/ip3/${encoded}.ico`,
    `https://www.google.com/s2/favicons?domain=${encoded}&sz=${size}`,
  ];
}
