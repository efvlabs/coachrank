import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { rateLimited } from "@/lib/api";
import { incrementStats } from "@/lib/domain/stats";
import { randomSuffix } from "@/lib/slug";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE = "cr_visitor";
const ONE_YEAR = 60 * 60 * 24 * 365;

/** Counts a browser once. Not a tracking identifier: a random opaque token, no PII. */
export async function POST(request: Request) {
  const jar = await cookies();
  if (jar.get(COOKIE)) return NextResponse.json({ ok: true, counted: false });

  if (rateLimited(request, "visit", 20, 60_000)) {
    return NextResponse.json({ ok: true, counted: false });
  }

  const id = `${Date.now().toString(36)}${randomSuffix(8)}`;
  jar.set(COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR,
  });

  await incrementStats({ visitors: 1 }).catch((error) =>
    console.error("[visit] increment failed:", error),
  );

  return NextResponse.json({ ok: true, counted: true });
}
