import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { BRAND_ASSESSMENT, type BrandAnswers, validBrandAnswers } from "../brand-assessment";
import { requireDb } from "../firebase/admin";
import { COLLECTIONS } from "./collections";

export const ASSESSMENT_COOKIE = "cr_brand_access";
export type AssessmentOrder = {
  id: string;
  accessHash: string;
  productId: string;
  priceCents: number;
  status: "pending" | "paid" | "failed" | "reversed";
  preview: boolean;
  checkoutUrl: string | null;
  dodoSessionId: string | null;
  dodoPaymentId: string | null;
  createdAtMs: number;
  paidAtMs: number | null;
  acceptedTermsAtMs: number;
  version: number;
  revision: number;
  answers: BrandAnswers | null;
  completed: { answers: BrandAnswers; completedAtMs: number }[];
  feedback: { helpful: number; comment: string; createdAtMs: number } | null;
};

const hash = (token: string) => createHash("sha256").update(token).digest("hex");
const orders = () => requireDb().collection(COLLECTIONS.assessmentOrders);

async function createOrder(productId: string, preview: boolean) {
  const id = randomBytes(16).toString("hex");
  const token = randomBytes(32).toString("hex");
  const now = Date.now();
  const order: AssessmentOrder = {
    id, accessHash: hash(token), productId, priceCents: BRAND_ASSESSMENT.priceCents,
    status: preview ? "paid" : "pending", preview, checkoutUrl: null, dodoSessionId: null,
    dodoPaymentId: null, createdAtMs: now, paidAtMs: preview ? now : null, acceptedTermsAtMs: now,
    version: BRAND_ASSESSMENT.version, revision: 0, answers: {}, completed: [], feedback: null,
  };
  await orders().doc(id).set(order);
  return { order, access: `${id}.${token}` };
}

export const createAssessmentOrder = (productId: string) => createOrder(productId, false);
/** This entry point is called only by the authenticated admin preview route. */
export const createAssessmentPreview = () => createOrder("admin-preview", true);

export async function authorizedAssessment(access: string | undefined): Promise<AssessmentOrder | null> {
  if (!access || !/^[a-f0-9]{32}\.[a-f0-9]{64}$/.test(access)) return null;
  const [id, token] = access.split(".");
  const snap = await orders().doc(id).get();
  if (!snap.exists) return null;
  const order = snap.data() as AssessmentOrder;
  const stored = Buffer.from(order.accessHash, "hex");
  const incoming = Buffer.from(hash(token), "hex");
  return stored.length === incoming.length && timingSafeEqual(stored, incoming) ? order : null;
}

export function assessmentView(order: AssessmentOrder) {
  return {
    id: order.id, status: order.status, preview: order.preview, revision: order.revision,
    answers: order.status === "paid" ? order.answers : null,
    completed: order.status === "paid" ? order.completed : [],
    feedbackSubmitted: Boolean(order.feedback),
    retakeUntilMs: order.completed[0] ? order.completed[0].completedAtMs + BRAND_ASSESSMENT.retakeDays * 86_400_000 : null,
    retakeExpired: Boolean(order.completed[0] && Date.now() > order.completed[0].completedAtMs + BRAND_ASSESSMENT.retakeDays * 86_400_000),
    canRetake: order.status === "paid" && order.completed.length === 1 && order.answers === null && Date.now() <= order.completed[0].completedAtMs + BRAND_ASSESSMENT.retakeDays * 86_400_000,
  };
}
export type AssessmentView = ReturnType<typeof assessmentView>;

export async function attachAssessmentCheckout(id: string, checkoutUrl: string, sessionId: string) {
  await orders().doc(id).update({ checkoutUrl, dodoSessionId: sessionId });
}

export async function markAssessmentFailed(id: string) {
  if (!/^[a-f0-9]{32}$/.test(id)) return;
  const db = requireDb();
  const ref = orders().doc(id);
  await db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    if (snap.exists && (snap.data() as AssessmentOrder).status === "pending") tx.update(ref, { status: "failed" });
  });
}

export async function processVerifiedAssessmentPayment(args: {
  orderId: string; dodoPaymentId: string; paidNetCents: number | null;
  productCart: { product_id: string; quantity: number }[] | null | undefined;
}) {
  if (!/^[a-f0-9]{32}$/.test(args.orderId)) return { outcome: "unknown_order" };
  const db = requireDb();
  const ref = orders().doc(args.orderId);
  const ledger = db.collection(COLLECTIONS.processedWebhooks).doc(args.dodoPaymentId);
  const reversal = db.collection(COLLECTIONS.assessmentReversals).doc(args.dodoPaymentId);
  return db.runTransaction(async tx => {
    const [snap, processed, reversed] = await Promise.all([tx.get(ref), tx.get(ledger), tx.get(reversal)]);
    if (!snap.exists) return { outcome: "unknown_order" };
    const order = snap.data() as AssessmentOrder;
    if (processed.exists || order.status === "paid" || order.status === "reversed") return { outcome: "already_processed" };
    if (order.preview || args.paidNetCents !== order.priceCents || args.productCart?.length !== 1 || args.productCart[0].product_id !== order.productId || args.productCart[0].quantity !== 1) {
      throw new Error("Assessment payment did not match its product and price.");
    }
    tx.update(ref, { status: reversed.exists ? "reversed" : "paid", dodoPaymentId: args.dodoPaymentId, paidAtMs: Date.now() });
    tx.set(ledger, { kind: "assessment", internalPaymentId: order.id, processedAtMs: Date.now() });
    return { outcome: reversed.exists ? "already_reversed" : "unlocked" };
  });
}

export async function reverseAssessmentPayment(dodoPaymentId: string, reference: string) {
  const db = requireDb();
  const ledger = db.collection(COLLECTIONS.processedWebhooks).doc(dodoPaymentId);
  const result = await db.runTransaction(async tx => {
    const entry = await tx.get(ledger);
    const data = entry.data() as { kind?: string; internalPaymentId?: string } | undefined;
    if (data?.kind && data.kind !== "assessment") return "not_assessment";
    const ref = data?.internalPaymentId ? orders().doc(data.internalPaymentId) : null;
    const order = ref ? await tx.get(ref) : null;
    // Keep a tombstone if a refund arrives before payment.succeeded.
    tx.set(db.collection(COLLECTIONS.assessmentReversals).doc(dodoPaymentId), { reference, createdAtMs: Date.now() });
    if (ref && order?.exists) tx.update(ref, { status: "reversed" });
    return ref ? "reversed" : "not_assessment";
  });
  return result;
}

export class AssessmentError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

export async function updateAssessment(id: string, revision: number, action: string, payload: unknown) {
  const db = requireDb();
  const ref = orders().doc(id);
  return db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new AssessmentError("Assessment not found.", 404);
    const order = snap.data() as AssessmentOrder;
    if (order.status !== "paid") throw new AssessmentError("Verified payment is required.", 403);
    if (revision !== order.revision) throw new AssessmentError("Your assessment changed in another tab. Reload to continue with the saved version.", 409);
    const patch: Partial<AssessmentOrder> = { revision: order.revision + 1 };
    if (action === "save" || action === "complete") {
      if (order.answers === null) throw new AssessmentError("This report is complete. Start your included reassessment to answer again.");
      if (!validBrandAnswers(payload, action === "complete")) throw new AssessmentError("Choose a valid answer for each question.");
      patch.answers = payload;
      if (action === "complete") {
        if (order.completed.length >= 2) throw new AssessmentError("Both included assessments are complete.");
        if (order.completed[0] && Date.now() > order.completed[0].completedAtMs + BRAND_ASSESSMENT.retakeDays * 86_400_000) throw new AssessmentError("The reassessment window has ended. Your saved report remains available.");
        patch.completed = [...order.completed, { answers: payload, completedAtMs: Date.now() }];
        patch.answers = null;
      }
    } else if (action === "retake") {
      const first = order.completed[0];
      if (!first || order.completed.length !== 1 || order.answers !== null || Date.now() > first.completedAtMs + BRAND_ASSESSMENT.retakeDays * 86_400_000) throw new AssessmentError("Your included reassessment is unavailable. Saved reports remain available.");
      patch.answers = {};
    } else if (action === "feedback") {
      const feedback = payload as { helpful?: unknown; comment?: unknown } | null;
      if (!order.completed.length || !feedback || !Number.isInteger(feedback.helpful) || Number(feedback.helpful) < 1 || Number(feedback.helpful) > 5 || typeof feedback.comment !== "string" || feedback.comment.length > 1000) throw new AssessmentError("Choose a rating and keep feedback under 1,000 characters.");
      patch.feedback = { helpful: Number(feedback.helpful), comment: feedback.comment.trim(), createdAtMs: Date.now() };
    } else throw new AssessmentError("Unknown action.");
    tx.update(ref, patch);
    return assessmentView({ ...order, ...patch });
  });
}

export async function recentAssessmentOrders(): Promise<AssessmentOrder[]> {
  const snap = await orders().orderBy("createdAtMs", "desc").limit(100).get();
  return snap.docs.map(doc => doc.data() as AssessmentOrder);
}
