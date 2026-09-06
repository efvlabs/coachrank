import { jsonError, jsonOk, rateLimited } from "@/lib/api";
import { currentAssessment, sameOriginRequest } from "@/lib/assessment-request";
import { reconcileAssessmentPayment } from "@/lib/assessment-payment";
import { assessmentView } from "@/lib/domain/assessments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  if (!sameOriginRequest(request)) return jsonError("Check your purchase on CoachRank.", 403);
  if (rateLimited(request, "assessment-verify", 12, 60_000)) return jsonError("Please wait before checking again.", 429);
  const order = await currentAssessment(request);
  if (!order || order.preview) return jsonError("Sign in to check your purchase.", 401);
  try {
    await reconcileAssessmentPayment(order);
    const updated = await currentAssessment(request);
    if (!updated) return jsonError("Please sign in again.", 401);
    return jsonOk({ order: assessmentView(updated) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return jsonError("We are still checking with Dodo. Please try again shortly. There is no need to pay again.", 503);
  }
}
