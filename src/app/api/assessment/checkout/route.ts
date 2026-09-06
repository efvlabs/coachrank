import { jsonError, jsonOk, rateLimited, readJson } from "@/lib/api";
import { currentAssessment, preserveLegacyAssessmentPreview, sameOriginRequest, setAssessmentAccess } from "@/lib/assessment-request";
import { assessmentProductId, createAssessmentCheckout, isAssessmentCheckoutConfigured } from "@/lib/dodo";
import { attachAssessmentCheckout, createAssessmentOrder, customerAssessment, markAssessmentFailed } from "@/lib/domain/assessments";
import { getCustomerUser } from "@/lib/customer-auth";
import { customerSignInUrl } from "@/lib/customer-links";
import { lockCustomerCheckout } from "@/lib/domain/customer-checkout";
import { reconcileAssessmentPayment } from "@/lib/assessment-payment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!sameOriginRequest(request)) return jsonError("Open checkout from CoachRank.", 403);
  if (rateLimited(request, "assessment-checkout", 8, 60_000)) return jsonError("Please wait a moment before trying again.", 429);
  const body = await readJson<{ acceptedTerms?: boolean }>(request);
  if (body?.acceptedTerms !== true) return jsonError("Please accept the assessment terms before checkout.");
  if (!isAssessmentCheckoutConfigured()) return jsonError("Checkout is temporarily unavailable. Your card has not been charged.", 503);
  const customer = await getCustomerUser();
  if (!customer) return jsonError("Sign in so your purchase and reports stay with your account.", 401, { signInUrl: customerSignInUrl("/tools/brand-clarity#get-assessment") });
  let orderId: string | null = null;
  const release = await lockCustomerCheckout(customer.uid);
  if (!release) return jsonError("Checkout is opening in another tab. Please wait a moment and try again.", 409);
  try {
    await preserveLegacyAssessmentPreview();
    const owned = await customerAssessment(customer.uid);
    let existing = owned?.status === "paid" || owned?.status === "pending" || owned?.status === "failed" ? owned : await currentAssessment();
    if (existing?.ownerUid === customer.uid && existing.dodoSessionId && ["pending", "failed"].includes(existing.status)) {
      // Do not offer another checkout while a previous payment is unconfirmed.
      await reconcileAssessmentPayment(existing);
      existing = await customerAssessment(customer.uid, existing.id);
    }
    if (existing?.status === "paid" && !existing.preview) return jsonOk({ checkoutUrl: `/tools/brand-clarity/assessment?order=${existing.id}` });
    if (existing?.status === "pending" && existing.ownerUid === customer.uid && existing.checkoutUrl && Date.now() - existing.createdAtMs < 24 * 60 * 60_000) return jsonOk({ checkoutUrl: existing.checkoutUrl });
    const { order, access } = await createAssessmentOrder(assessmentProductId()!, customer);
    orderId = order.id;
    // Establish access before leaving for payment, and retain it if Dodo is slow.
    await setAssessmentAccess(access);
    const checkout = await createAssessmentCheckout(order.id, order.productId, customer);
    await attachAssessmentCheckout(order.id, checkout.checkoutUrl, checkout.sessionId);
    return jsonOk({ checkoutUrl: checkout.checkoutUrl });
  } catch (error) {
    console.error("[assessment-checkout] could not start checkout", error instanceof Error ? error.message : "unknown error");
    if (orderId) await markAssessmentFailed(orderId).catch(() => {});
    return jsonError("We could not open checkout. Please try again shortly.", 502);
  } finally {
    await release().catch(() => {});
  }
}
