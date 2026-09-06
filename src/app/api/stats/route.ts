import { NextResponse } from "next/server";

import { rateLimited } from "@/lib/api";
import { PRESENCE_ENABLED } from "@/lib/config";
import { getOnlineCount, getSiteStats } from "@/lib/domain/stats";
import type { PublicStatsSnapshot } from "@/lib/domain/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  if (rateLimited(request, "public-stats", 60, 60_000)) {
    return NextResponse.json({ error: "Please try again shortly." }, {
      status: 429,
      headers: { ...headers, "Retry-After": "60" },
    });
  }

  const [stats, onlineCount] = await Promise.all([
    getSiteStats(),
    PRESENCE_ENABLED ? getOnlineCount() : Promise.resolve(null),
  ]);
  const snapshot: PublicStatsSnapshot = {
    stats: {
      visitors: stats.visitors,
      outboundClicks: stats.outboundClicks,
      leaderboardRevenueCents: stats.leaderboardRevenueCents,
    },
    onlineCount,
  };
  return NextResponse.json(snapshot, { headers });
}
