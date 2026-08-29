import { ImageResponse } from "next/og";

import { SITE } from "@/lib/config";

export const runtime = "nodejs";
export const alt = SITE.title;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
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
            fontSize: 118,
            fontWeight: 800,
            letterSpacing: -6,
            marginTop: 26,
          }}
        >
          Every ranking
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 118,
            fontWeight: 800,
            letterSpacing: -6,
            color: "#a8baff",
          }}
        >
          here is paid.
        </div>
        <div style={{ display: "flex", fontSize: 30, color: "#9aa0b0", marginTop: 34 }}>
          And we show you how much.
        </div>
      </div>
    ),
    size,
  );
}
