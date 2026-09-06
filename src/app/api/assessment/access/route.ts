import { getAdminUser } from "@/lib/admin-auth";
import { jsonError, jsonOk, rateLimited, readJson } from "@/lib/api";
import { sameOriginRequest, setAssessmentAccess } from "@/lib/assessment-request";
import { authorizedAssessment } from "@/lib/domain/assessments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!sameOriginRequest(request)) return jsonError("Open the access link on CoachRank.", 403);
  if (rateLimited(request, "assessment-access", 10, 60_000)) return jsonError("Please wait before trying again.", 429);
  const body = await readJson<{ access?: string }>(request);
  if (typeof body?.access !== "string") return jsonError("Your access link is incomplete.", 400);
  const order = await authorizedAssessment(body.access);
  if (!order || order.status !== "paid") return jsonError("This access link is unavailable. Contact support with your payment receipt.", 403);
  if (order.preview && !await getAdminUser()) return jsonError("Sign in to CoachRank Studio to open an admin preview.", 403);
  await setAssessmentAccess(body.access, order.preview ? "preview" : "purchase");
  return jsonOk({ url: `/tools/brand-clarity/assessment${order.preview ? "?preview=true" : ""}` }, { headers: { "Cache-Control": "no-store" } });
}
