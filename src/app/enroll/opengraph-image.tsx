import { ImageResponse } from "next/og";

import { OG_SIZE, brandCard } from "@/lib/og-card";

export const runtime = "nodejs";
export const alt = "Coaches who back themselves - CoachRank";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function EnrollOpenGraphImage() {
  return new ImageResponse(brandCard(), size);
}
