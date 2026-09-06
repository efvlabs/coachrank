import { cookies } from "next/headers";
import { jsonError, jsonOk, rateLimited, readJson } from "@/lib/api";
import { sameOriginRequest } from "@/lib/assessment-request";
import { getCustomerUser } from "@/lib/customer-auth";
import { ASSESSMENT_COOKIE, AssessmentError, authorizedAssessment, claimAssessment } from "@/lib/domain/assessments";
import { netPaidUsdCents, readCheckoutMetadata, requireDodoClient } from "@/lib/dodo";
import { requireDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/domain/collections";
import type { AssessmentOrder } from "@/lib/domain/assessments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!sameOriginRequest(request)) return jsonError("Open My tools on CoachRank.", 403);
  if (rateLimited(request, "customer-claim", 8, 60_000)) return jsonError("Please wait a minute before trying again.", 429);
  const user = await getCustomerUser();
  if (!user) return jsonError("Sign in before connecting a purchase.", 401);
  const body = await readJson<{ access?: unknown; receipt?: unknown; useSavedLink?: unknown }>(request);
  if (!body) return jsonError("Enter your private link or payment reference.");
  try {
    let id: string | undefined;
    let access = typeof body.access === "string" && body.access.length < 2000 ? body.access.trim() : "";
    if (body.useSavedLink === true) access = (await cookies()).get(ASSESSMENT_COOKIE)?.value ?? "";
    if (access) {
      if (access.startsWith("http")) {
        const url = new URL(access);
        if (url.hostname !== "coachrank.lol" || url.pathname !== "/tools/brand-clarity/access") return jsonError("Use the private access link from CoachRank.");
        access = url.hash.slice(1);
      }
      const order = await authorizedAssessment(access);
      if (order && !order.preview && order.status === "paid") id = order.id;
    } else if (typeof body.receipt === "string" && /^pay_[A-Za-z0-9]{5,100}$/.test(body.receipt.trim())) {
      // Dodo's authenticated API is the source of receipt ownership, not submitted email.
      const payment = await requireDodoClient().payments.retrieve(body.receipt.trim());
      const meta = readCheckoutMetadata(payment.metadata);
      if (payment.status === "succeeded" && payment.customer.email.trim().toLowerCase() === user.email.trim().toLowerCase() && meta.kind === "assessment" && meta.internalPaymentId && /^[a-f0-9]{32}$/.test(meta.internalPaymentId)) {
        const snap = await requireDb().collection(COLLECTIONS.assessmentOrders).doc(meta.internalPaymentId).get();
        const order = snap.data() as AssessmentOrder | undefined;
        if (order && order.dodoPaymentId === payment.payment_id && !order.preview && order.status === "paid" && netPaidUsdCents(payment) === order.priceCents && payment.product_cart?.length === 1 && payment.product_cart[0].product_id === order.productId && payment.product_cart[0].quantity === 1) id = order.id;
      }
    }
    if (!id) return jsonError("We could not match that purchase. Use your private link, or sign in with your checkout email and enter the Dodo payment ID. Contact support with your receipt if you need help.", 403);
    await claimAssessment(id, user);
    return jsonOk({ url: `/tools/brand-clarity/assessment?order=${id}` }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof AssessmentError) return jsonError(error.message, error.status);
    return jsonError("We could not connect that purchase. Check your link or receipt, or contact contact@coachrank.lol.", 400);
  }
}
