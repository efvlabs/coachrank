import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "Coaches who back themselves - CoachRank";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * The card people see when this page is shared, which in practice means the card attached
 * to an outreach message. It answers the only question that matters in a cold DM - what
 * is this going to cost me - before they have opened anything.
 */
export default function EnrollOpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          justifyContent: "center",
          padding: 72,
          background: "#12141a",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 22, color: "#9aa0b0", letterSpacing: 3 }}>
          COACHRANK.LOL
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 92,
            fontWeight: 800,
            letterSpacing: -4,
            marginTop: 26,
          }}
        >
          Coaches who
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 92,
            fontWeight: 800,
            letterSpacing: -4,
            color: "#a8baff",
          }}
        >
          back themselves.
        </div>
        <div style={{ display: "flex", fontSize: 29, color: "#9aa0b0", marginTop: 32 }}>
          A page that ranks for your name, and a badge for your site.
        </div>
      </div>
    ),
    size,
  );
}
