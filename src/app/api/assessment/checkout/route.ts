import { jsonError, jsonOk, rateLimited, readJson } from "@/lib/api";
import { currentAssessment, preserveLegacyAssessmentPreview, sameOriginRequest, setAssessmentAccess } from "@/lib/assessment-request";
import { assessmentProductId, createAssessmentCheckout, isAssessmentCheckoutConfigured } from "@/lib/dodo";
import { attachAssessmentCheckout, createAssessmentOrder, markAssessmentFailed } from "@/lib/domain/assessments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!sameOriginRequest(request)) return jsonError("Open checkout from CoachRank.", 403);
  if (rateLimited(request, "assessment-checkout", 8, 60_000)) return jsonError("Please wait a moment before trying again.", 429);
  const body = await readJson<{ acceptedTerms?: boolean }>(request);
  if (body?.acceptedTerms !== true) return jsonError("Please accept the assessment terms before checkout.");
  if (!isAssessmentCheckoutConfigured()) return jsonError("Checkout is temporarily unavailable. Your card has not been charged.", 503);
  let orderId: string | null = null;
  try {
    await preserveLegacyAssessmentPreview();
    const existing = await currentAssessment();
    if (existing?.status === "paid" && !existing.preview) return jsonOk({ checkoutUrl: "/tools/brand-clarity/assessment" });
    if (existing?.status === "pending" && existing.checkoutUrl && Date.now() - existing.createdAtMs < 15 * 60_000) return jsonOk({ checkoutUrl: existing.checkoutUrl });
    const { order, access } = await createAssessmentOrder(assessmentProductId()!);
    orderId = order.id;
    // Establish access before leaving for payment, and retain it if Dodo is slow.
    await setAssessmentAccess(access);
    const checkout = await createAssessmentCheckout(order.id, order.productId);
    await attachAssessmentCheckout(order.id, checkout.checkoutUrl, checkout.sessionId);
    return jsonOk({ checkoutUrl: checkout.checkoutUrl });
  } catch (error) {
    console.error("[assessment-checkout] could not start checkout", error instanceof Error ? error.message : "unknown error");
    if (orderId) await markAssessmentFailed(orderId).catch(() => {});
    return jsonError("We could not open checkout. Please try again shortly.", 502);
  }
}
