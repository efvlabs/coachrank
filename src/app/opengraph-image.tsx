import { ImageResponse } from "next/og";

import { SITE } from "@/lib/config";
import { OG_SIZE, brandCard } from "@/lib/og-card";

export const runtime = "nodejs";
export const alt = SITE.title;
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(brandCard(), size);
}
