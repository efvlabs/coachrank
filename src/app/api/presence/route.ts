import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { rateLimited } from "@/lib/api";
import { PRESENCE_ENABLED } from "@/lib/config";
import { recordPresenceHeartbeat, sweepStalePresence } from "@/lib/domain/stats";
import { randomSuffix } from "@/lib/slug";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE = "cr_presence";

/**
 * One heartbeat per open tab. The "N online" figure is a count of heartbeats received
 * inside the presence window - a real measurement, never an estimate.
 */
export async function POST(request: Request) {
  if (!PRESENCE_ENABLED) return NextResponse.json({ ok: true, disabled: true });
  if (rateLimited(request, "presence", 8, 30_000)) {
    return NextResponse.json({ ok: true, throttled: true });
  }

  const jar = await cookies();
  let id = jar.get(COOKIE)?.value;
  if (!id || !/^[a-z0-9]{6,32}$/.test(id)) {
    id = randomSuffix(16);
    jar.set(COOKIE, id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24,
    });
  }

  await recordPresenceHeartbeat(id).catch(() => {});

  // Cheap opportunistic cleanup keeps the collection bounded without a scheduled job.
  if (Math.random() < 0.02) void sweepStalePresence();

  return NextResponse.json({ ok: true });
}
