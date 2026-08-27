/**
 * A coach's website is the identity of their listing. Two submissions that point at the
 * same site must resolve to the same `normalizedWebsite` so we never create a duplicate
 * listing - while distinct, meaningful paths stay distinct.
 */

const TRACKING_PARAM_PREFIXES = ["utm_", "vero_", "_hs", "pk_", "mtm_", "matomo_", "hsa_"];

const TRACKING_PARAMS = new Set([
  "gclid", "gbraid", "wbraid", "gad_source", "gclsrc",
  "fbclid", "igshid", "twclid", "ttclid", "msclkid", "yclid", "dclid", "rdt_cid",
  "mc_cid", "mc_eid", "ml_subscriber", "ml_subscriber_hash",
  "ref", "referer", "referrer", "referral", "referral_code", "via", "aff", "aff_id",
  "affiliate", "affiliate_id", "partner", "partnerid", "cmpid", "campaignid", "adgroupid",
  "source", "src", "campaign", "medium", "content", "term",
  "spm", "scid", "sc_cid", "trk", "trk_contact", "trk_module", "epik", "s_kwcid",
  "at_medium", "at_campaign", "gh_src", "wickedid", "wickedsource",
]);

/** Obvious URL shorteners - the destination, not the shortener, is the identity. */
const SHORTENER_HOSTS = new Set([
  "bit.ly", "t.co", "tinyurl.com", "goo.gl", "ow.ly", "buff.ly", "is.gd", "cutt.ly",
  "rebrand.ly", "shorturl.at", "rb.gy", "t.ly", "lnkd.in", "shorte.st", "adf.ly",
  "bl.ink", "tiny.cc", "snip.ly", "clck.ru", "s.id", "v.gd", "trib.al", "qr.ae",
  "short.io", "bitly.com", "u.to", "chilp.it", "urlz.fr", "tny.im",
]);

const DEFAULT_PORTS: Record<string, string> = { "http:": "80", "https:": "443" };

export type UrlRejectionReason =
  | "empty"
  | "malformed"
  | "unsupported_scheme"
  | "no_public_host"
  | "shortener"
  | "too_long";

export type NormalizedUrl = {
  /** Stable identity key. Scheme-less, www-less, tracking-free. e.g. `example.com/coaching` */
  normalized: string;
  /** What we link to and show. Always absolute https(s) with the original meaningful path. */
  display: string;
  /** Hostname without `www.`, used for favicons and compact display. */
  host: string;
};

function isTrackingParam(key: string): boolean {
  const k = key.toLowerCase();
  if (TRACKING_PARAMS.has(k)) return true;
  return TRACKING_PARAM_PREFIXES.some((p) => k.startsWith(p));
}

/** Hostname must look like a real public domain: at least one dot and a plausible TLD. */
function hasPublicHostname(hostname: string): boolean {
  if (hostname === "localhost" || hostname.endsWith(".localhost")) return false;
  // Bare IPv4 / IPv6 hosts are not coach websites.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return false;
  if (hostname.includes(":")) return false;
  const labels = hostname.split(".");
  if (labels.length < 2) return false;
  const tld = labels[labels.length - 1];
  if (!/^[a-z]{2,24}$/.test(tld)) return false;
  return labels.every((l) => /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(l) && l.length <= 63);
}

export function normalizeWebsite(
  input: string | null | undefined,
): { ok: true; value: NormalizedUrl } | { ok: false; reason: UrlRejectionReason } {
  const raw = (input ?? "").trim();
  if (!raw) return { ok: false, reason: "empty" };
  if (raw.length > 400) return { ok: false, reason: "too_long" };

  // Reject dangerous schemes before the URL parser gets a chance to normalise them away.
  if (/^\s*(javascript|data|vbscript|file|blob|about|mailto|tel|ftp):/i.test(raw)) {
    return { ok: false, reason: "unsupported_scheme" };
  }

  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;

  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return { ok: false, reason: "malformed" };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, reason: "unsupported_scheme" };
  }

  let hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!hasPublicHostname(hostname)) return { ok: false, reason: "no_public_host" };
  if (hostname.startsWith("www.")) hostname = hostname.slice(4);
  if (SHORTENER_HOSTS.has(hostname)) return { ok: false, reason: "shortener" };

  // Path: keep it - distinct paths are distinct listings - but drop a trailing slash so
  // `/coaching` and `/coaching/` are one listing.
  let path = url.pathname;
  if (path === "/") path = "";
  else path = path.replace(/\/+$/, "");

  // Query: keep only params that actually identify the destination.
  const kept: [string, string][] = [];
  url.searchParams.forEach((value, key) => {
    if (!isTrackingParam(key)) kept.push([key, value]);
  });
  kept.sort((a, b) => (a[0] === b[0] ? a[1].localeCompare(b[1]) : a[0].localeCompare(b[0])));
  const query = kept.length
    ? "?" + kept.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&")
    : "";

  const port = url.port && url.port !== DEFAULT_PORTS[url.protocol] ? `:${url.port}` : "";

  const normalized = `${hostname}${port}${path}${query}`;
  const display = `https://${hostname}${port}${path}${query}`;

  return { ok: true, value: { normalized, display, host: hostname } };
}

/** `sarahchen.com/coaching` - what we print on a listing card. */
export function prettyWebsite(displayWebsite: string): string {
  return displayWebsite.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
}
