const RESERVED = new Set([
  "admin", "api", "blog", "about", "rules", "terms", "privacy", "categories",
  "coaches", "go", "r", "c", "success", "sitemap", "robots", "new", "today",
]);

export function slugifyName(name: string): string {
  const base = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
  return base || "coach";
}

const ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";

export function randomSuffix(length = 4): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}

/** `sarah-chen-k4m2` - human readable, collision resistant, never a reserved route. */
export function buildListingSlug(name: string): string {
  const base = slugifyName(name);
  return RESERVED.has(base) ? `${base}-coach-${randomSuffix()}` : `${base}-${randomSuffix()}`;
}

export function isReservedSlug(slug: string): boolean {
  return RESERVED.has(slug);
}
