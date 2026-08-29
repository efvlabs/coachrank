import { ImageResponse } from "next/og";

import { BLOG_ENABLED } from "@/lib/config";
import { getPublishedPostBySlug } from "@/lib/domain/blog";

export const runtime = "nodejs";
export const alt = "CoachRank article";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * A generated card for every article, so a post has a preview the moment it publishes and
 * nobody has to make artwork for it. The same image backs the cards on /blog, which is why
 * the title is capped rather than shrunk to fit - a long headline reads better truncated
 * at a legible size than complete at an illegible one.
 */
export default async function BlogOpenGraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = BLOG_ENABLED ? await getPublishedPostBySlug(slug) : null;
  const title = post?.title ?? "CoachRank";
  const trimmed = title.length > 96 ? `${title.slice(0, 95).trimEnd()}…` : title;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          justifyContent: "space-between",
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
            fontSize: trimmed.length > 58 ? 62 : 78,
            fontWeight: 800,
            letterSpacing: -2,
            lineHeight: 1.08,
          }}
        >
          {trimmed}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", width: 46, height: 8, background: "#a8baff" }} />
          <div style={{ display: "flex", fontSize: 26, color: "#9aa0b0" }}>
            Find coaches who back themselves
          </div>
        </div>
      </div>
    ),
    size,
  );
}
