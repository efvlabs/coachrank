import { ImageResponse } from "next/og";

import { categoryLabel } from "@/lib/categories";
import { SITE } from "@/lib/config";
import { computeRanks, getListingBySlug } from "@/lib/domain/listings";
import { formatCents } from "@/lib/money";

export const runtime = "nodejs";
export const alt = "CoachRank rank card";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#12141a";
const WHITE = "#ffffff";
const MUTED = "#9aa0b0";
const ACCENT = "#a8baff";
const RULE = "#2a2e3a";

/** Satori lays out plain flex columns reliably; every box here is one. */
const col = (extra: Record<string, string | number> = {}) => ({
  display: "flex" as const,
  flexDirection: "column" as const,
  ...extra,
});
const row = (extra: Record<string, string | number> = {}) => ({
  display: "flex" as const,
  alignItems: "center" as const,
  ...extra,
});

export default async function OpenGraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const listing = await getListingBySlug(slug);

  if (!listing || listing.status !== "active") {
    return new ImageResponse(
      (
        <div
          style={{
            ...col({ width: "100%", height: "100%", justifyContent: "center", padding: 72 }),
            background: INK,
            color: WHITE,
            fontFamily: "sans-serif",
          }}
        >
          <div style={{ ...row({ fontSize: 22, color: MUTED, letterSpacing: 3 }) }}>
            THE PAID LEADERBOARD FOR COACHES
          </div>
          <div style={{ ...row({ fontSize: 120, fontWeight: 800, letterSpacing: -6, marginTop: 20 }) }}>
            CoachRank
          </div>
        </div>
      ),
      size,
    );
  }

  const ranks = await computeRanks(listing);
  const isTop = ranks.overallRank === 1;

  return new ImageResponse(
    (
      <div
        style={{
          ...col({ width: "100%", height: "100%", padding: 70 }),
          background: INK,
          color: WHITE,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ ...row({ gap: 14 }) }}>
          <div style={{ display: "flex", width: 12, height: 12, background: ACCENT, borderRadius: 3 }} />
          <div style={{ ...row({ fontSize: 21, color: MUTED, letterSpacing: 3 }) }}>
            {isTop ? "HOLDING #1" : "ON THE BOARD"}
          </div>
        </div>

        <div style={{ ...row({ fontSize: 168, fontWeight: 800, letterSpacing: -9, color: ACCENT, marginTop: 34 }) }}>
          #{ranks.overallRank}
        </div>

        <div
          style={{
            ...row({
              fontSize: listing.name.length > 20 ? 66 : 84,
              fontWeight: 800,
              letterSpacing: -3,
              marginTop: 6,
            }),
          }}
        >
          {listing.name}
        </div>

        <div style={{ ...row({ gap: 70, marginTop: 46, borderTop: `1px solid ${RULE}`, paddingTop: 30 }) }}>
          <div style={{ ...col() }}>
            <div style={{ ...row({ fontSize: 18, color: MUTED, letterSpacing: 2 }) }}>STANDING BID</div>
            <div style={{ ...row({ fontSize: 48, fontWeight: 800, marginTop: 8 }) }}>
              {formatCents(listing.standingBidCents)}
            </div>
          </div>
          <div style={{ ...col() }}>
            <div style={{ ...row({ fontSize: 18, color: MUTED, letterSpacing: 2 }) }}>
              {categoryLabel(listing.category).toUpperCase()}
            </div>
            <div style={{ ...row({ fontSize: 48, fontWeight: 800, marginTop: 8 }) }}>
              #{ranks.categoryRank}
            </div>
          </div>
          <div style={{ ...col({ marginLeft: "auto", alignItems: "flex-end", justifyContent: "flex-end" }) }}>
            <div style={{ ...row({ fontSize: 36, fontWeight: 800, letterSpacing: -1 }) }}>CoachRank</div>
            <div style={{ ...row({ fontSize: 18, color: MUTED, marginTop: 6 }) }}>
              {SITE.tagline}
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
