import { NextResponse, type NextRequest } from "next/server";

import { faviconSources, initialsSvg } from "@/lib/favicon";
import { getListingPhoto } from "@/lib/domain/profile";
import { normalizeWebsite } from "@/lib/url";

export const runtime = "nodejs";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/x-icon", "image/vnd.microsoft.icon", "image/gif", "image/svg+xml"];
const MAX_BYTES = 128 * 1024;
const CACHE = "public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800";

function svgResponse(text: string, seed: string, size: number) {
  return new NextResponse(initialsSvg(text, seed, size), {
    headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": CACHE },
  });
}

/**
 * Resolves a listing's icon server-side. A failed upstream fetch degrades to a generated
 * initials avatar with the same dimensions, so the layout never shifts and no broken
 * image icon can appear.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const rawHost = (params.get("host") ?? "").trim().toLowerCase();
  const text = (params.get("n") ?? "?").slice(0, 2);
  const size = Math.min(256, Math.max(16, Number(params.get("s")) || 64));
  const listingId = (params.get("l") ?? "").trim();

  // A coach's own photo outranks anything we could scrape from their website.
  if (listingId) {
    const photo = await getListingPhoto(listingId);
    if (photo) {
      return new NextResponse(new Uint8Array(photo.buffer), {
        headers: {
          "Content-Type": photo.contentType,
          // Shorter than a favicon's week: a coach who changes their photo should see it.
          "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
        },
      });
    }
  }

  // Reuse the submission-time normaliser so this endpoint cannot be pointed at arbitrary hosts.
  const parsed = normalizeWebsite(rawHost);
  if (!parsed.ok) return svgResponse(text, rawHost || text, size);
  const host = parsed.value.host;

  for (const source of faviconSources(host, size)) {
    try {
      const upstream = await fetch(source, {
        signal: AbortSignal.timeout(2500),
        redirect: "follow",
        headers: { Accept: "image/*" },
        next: { revalidate: 604800 },
      });
      if (!upstream.ok) continue;

      const type = (upstream.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
      if (!ALLOWED_TYPES.includes(type)) continue;

      const buffer = await upstream.arrayBuffer();
      // Some services answer with a 1x1 placeholder; treat a tiny body as "no icon".
      if (buffer.byteLength < 90 || buffer.byteLength > MAX_BYTES) continue;

      return new NextResponse(buffer, {
        headers: {
          "Content-Type": type,
          "Cache-Control": CACHE,
          "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
        },
      });
    } catch {
      // Try the next source, then fall through to the initials avatar.
    }
  }

  return svgResponse(text, host, size);
}
