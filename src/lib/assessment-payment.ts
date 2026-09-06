import "server-only";
import { getDodoClient, netPaidUsdCents, readCheckoutMetadata } from "./dodo";
import { markAssessmentFailed, processVerifiedAssessmentPayment, type AssessmentOrder } from "./domain/assessments";

/** Recovery for a delayed webhook. Called only after the caller proves order access. */
export async function reconcileAssessmentPayment(order: AssessmentOrder) {
  if (order.preview || !["pending", "failed"].includes(order.status) || !order.dodoSessionId) return;
  const dodo = getDodoClient();
  if (!dodo) return;
  const session = await dodo.checkoutSessions.retrieve(order.dodoSessionId, { timeout: 10_000, maxRetries: 0 });
  if (!session.payment_id) return;
  const payment = await dodo.payments.retrieve(session.payment_id, { timeout: 10_000, maxRetries: 0 });
  const meta = readCheckoutMetadata(payment.metadata);
  if (meta.kind !== "assessment" || meta.internalPaymentId !== order.id || payment.payment_id !== session.payment_id) throw new Error("Payment did not match this assessment.");
  if (payment.status === "succeeded") {
    await processVerifiedAssessmentPayment({ orderId: order.id, dodoPaymentId: payment.payment_id, paidNetCents: netPaidUsdCents(payment), productCart: payment.product_cart });
  } else if (["failed", "cancelled"].includes(payment.status ?? "")) await markAssessmentFailed(order.id);
}
