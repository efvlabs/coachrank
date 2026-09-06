import { cookies } from "next/headers";
import { jsonError, jsonOk, rateLimited, readJson } from "@/lib/api";
import { sameOriginRequest } from "@/lib/assessment-request";
import { CUSTOMER_COOKIE, CUSTOMER_SESSION_MS, getCustomerUser } from "@/lib/customer-auth";
import { ASSESSMENT_COOKIE } from "@/lib/domain/assessments";
import { getAdminAuth } from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };

export async function GET() {
  return jsonOk({ user: await getCustomerUser() }, { headers });
}

export async function POST(request: Request) {
  if (!sameOriginRequest(request)) return jsonError("Open sign-in on CoachRank.", 403);
  if (rateLimited(request, "customer-session", 12, 60_000)) return jsonError("Please wait a minute before trying again.", 429);
  const body = await readJson<{ idToken?: unknown }>(request);
  if (typeof body?.idToken !== "string" || body.idToken.length > 10000) return jsonError("Your sign-in could not be verified.", 400);
  const auth = getAdminAuth();
  if (!auth) return jsonError("Sign-in is temporarily unavailable. Please try again shortly.", 503);
  try {
    const decoded = await auth.verifyIdToken(body.idToken, true);
    const age = Date.now() / 1000 - decoded.auth_time;
    if (!decoded.email_verified || !decoded.email) return jsonError("Verify your email using an email sign-in link or Google.", 403);
    if (!Number.isFinite(age) || age < -60 || age > 300) return jsonError("Please sign in again to start a fresh session.", 401);
    const session = await auth.createSessionCookie(body.idToken, { expiresIn: CUSTOMER_SESSION_MS });
    (await cookies()).set(CUSTOMER_COOKIE, session, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: CUSTOMER_SESSION_MS / 1000 });
    return jsonOk({ user: { uid: decoded.uid, email: decoded.email, name: decoded.name ?? null } }, { headers });
  } catch {
    // Never log ID tokens, session cookies or Firebase errors containing credentials.
    return jsonError("We could not complete sign-in. Please request a fresh link or try Google again.", 401);
  }
}

export async function DELETE(request: Request) {
  if (!sameOriginRequest(request)) return jsonError("Open sign-out on CoachRank.", 403);
  const jar = await cookies();
  jar.delete(CUSTOMER_COOKIE);
  jar.delete(ASSESSMENT_COOKIE);
  return jsonOk({}, { headers });
}
