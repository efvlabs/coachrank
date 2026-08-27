import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { jsonError, rateLimited, readJson } from "@/lib/api";
import { ADMIN_COOKIE, ADMIN_SESSION_MS } from "@/lib/admin-auth";
import { isAdminEmail } from "@/lib/config";
import { getAdminAuth } from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Exchanges a Firebase ID token for an httpOnly session cookie, admin allow-list enforced. */
export async function POST(request: Request) {
  if (rateLimited(request, "admin-session", 12, 60_000)) {
    return jsonError("Too many attempts.", 429);
  }

  const auth = getAdminAuth();
  if (!auth) return jsonError("Admin is not configured.", 503);

  const body = await readJson<{ idToken?: string }>(request);
  if (!body?.idToken) return jsonError("Missing token.", 400);

  try {
    const decoded = await auth.verifyIdToken(body.idToken, true);
    if (!isAdminEmail(decoded.email)) {
      return jsonError("That account is not an administrator.", 403);
    }

    const sessionCookie = await auth.createSessionCookie(body.idToken, {
      expiresIn: ADMIN_SESSION_MS,
    });

    (await cookies()).set(ADMIN_COOKIE, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: ADMIN_SESSION_MS / 1000,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/session] sign-in failed:", error);
    return jsonError("Could not verify that sign-in.", 401);
  }
}

export async function DELETE() {
  (await cookies()).delete(ADMIN_COOKIE);
  return NextResponse.json({ ok: true });
}
