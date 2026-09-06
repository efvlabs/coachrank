import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { BRAND_ASSESSMENT, type BrandAnswers, validBrandAnswers } from "../brand-assessment";
import { requireDb } from "../firebase/admin";
import { COLLECTIONS } from "./collections";

export const ASSESSMENT_COOKIE = "cr_brand_access";
export type AssessmentOrder = {
  id: string;
  ownerUid?: string;
  ownerEmail?: string;
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
  completed: { answers: BrandAnswers; completedAtMs: number; index?: number }[];
  completedCount?: number;
  feedback: { helpful: number; comment: string; createdAtMs: number } | null;
};

const hash = (token: string) => createHash("sha256").update(token).digest("hex");
const orders = () => requireDb().collection(COLLECTIONS.assessmentOrders);

async function createOrder(productId: string, preview: boolean, owner?: { uid: string; email: string }) {
  const id = randomBytes(16).toString("hex");
  const token = randomBytes(32).toString("hex");
  const now = Date.now();
  const order: AssessmentOrder = {
    id, accessHash: hash(token), productId, priceCents: BRAND_ASSESSMENT.priceCents,
    status: preview ? "paid" : "pending", preview, checkoutUrl: null, dodoSessionId: null,
    dodoPaymentId: null, createdAtMs: now, paidAtMs: preview ? now : null, acceptedTermsAtMs: now,
    version: BRAND_ASSESSMENT.version, revision: 0, answers: {}, completed: [], completedCount: 0, feedback: null,
    ...(owner && !preview ? { ownerUid: owner.uid, ownerEmail: owner.email } : {}),
  };
  await orders().doc(id).set(order);
  return { order, access: `${id}.${token}` };
}

export const createAssessmentOrder = (productId: string, owner?: { uid: string; email: string }) => createOrder(productId, false, owner);
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
  if (stored.length !== incoming.length || !timingSafeEqual(stored, incoming)) return null;
  return hydrateReports(order);
}

export async function customerAssessmentOrders(uid: string): Promise<AssessmentOrder[]> {
  const snap = await orders().where("ownerUid", "==", uid).get();
  return snap.docs.map(doc => doc.data() as AssessmentOrder).filter(order => !order.preview).sort((a,b) => b.createdAtMs - a.createdAtMs);
}

export async function customerAssessment(uid: string, id?: string): Promise<AssessmentOrder | null> {
  if (id !== undefined) {
    if (!/^[a-f0-9]{32}$/.test(id)) return null;
    const doc = await orders().doc(id).get();
    const order = doc.data() as AssessmentOrder | undefined;
    return order && !order.preview && order.ownerUid === uid ? hydrateReports(order) : null;
  }
  const all = await customerAssessmentOrders(uid);
  const order = all.find(order => order.status === "paid") ?? all.find(order => order.status === "pending") ?? all[0];
  return order ? hydrateReports(order) : null;
}

/** Only call after verifying a legacy private link or the payer's receipt and email. */
export async function claimAssessment(id: string, owner: { uid: string; email: string }) {
  return requireDb().runTransaction(async tx => {
    const ref = orders().doc(id);
    const snap = await tx.get(ref);
    const order = snap.data() as AssessmentOrder | undefined;
    if (!order || order.preview || order.status !== "paid") throw new AssessmentError("We could not connect this purchase. Contact support with your receipt.", 403);
    if (order.ownerUid && order.ownerUid !== owner.uid) throw new AssessmentError("This purchase is already connected to another account. Sign in with the account used for your purchase.", 403);
    tx.update(ref, { ownerUid: owner.uid, ownerEmail: owner.email });
    return order.id;
  });
}

export type AssessmentRun = { answers: BrandAnswers; completedAtMs: number; index: number };
export const reportCount = (order: AssessmentOrder) => order.completedCount ?? order.completed.length;
const reportCollection = (id: string) => requireDb().collection(`${COLLECTIONS.assessmentOrders}/${id}/reports`);
const reportId = (index: number) => String(index).padStart(12,"0");

export async function assessmentHistory(order: AssessmentOrder, before?: number): Promise<AssessmentRun[]> {
  if (order.status !== "paid") return [];
  if (order.completedCount === undefined) return order.completed.map((run,index)=>({...run,index})).filter(run=>before===undefined || run.index<before).slice(-20);
  let query = reportCollection(order.id).orderBy("index","desc").limit(20);
  if (before !== undefined) query = query.where("index","<",before);
  const snap = await query.get();
  return snap.docs.map(doc=>doc.data() as AssessmentRun).reverse();
}
async function hydrateReports(order: AssessmentOrder): Promise<AssessmentOrder> {
  return order.status === "paid" ? { ...order, completed: await assessmentHistory(order) } : order;
}
export async function assessmentRun(order: AssessmentOrder, index: number): Promise<AssessmentRun | null> {
  if (order.status !== "paid" || !Number.isInteger(index) || index < 0 || index >= reportCount(order)) return null;
  if (order.completedCount === undefined) return { ...order.completed[index], index };
  const snap = await reportCollection(order.id).doc(reportId(index)).get();
  return snap.exists ? snap.data() as AssessmentRun : null;
}
export function assessmentView(order: AssessmentOrder) {
  return {
    id: order.id, status: order.status, preview: order.preview, revision: order.revision,
    accountLinked: Boolean(order.ownerUid),
    answers: order.status === "paid" ? order.answers : null,
    completed: order.status === "paid" ? order.completed.map((run,index)=>({...run,index:run.index ?? index})) : [],
    completedCount: order.status === "paid" ? reportCount(order) : 0,
    feedbackSubmitted: Boolean(order.feedback),
    canRetake: order.status === "paid" && reportCount(order) > 0 && order.answers === null,
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

export async function updateAssessment(id: string, revision: number, action: string, payload: unknown, expectedOwner?: string | null) {
  const db = requireDb();
  const ref = orders().doc(id);
  const updated = await db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new AssessmentError("Assessment not found.", 404);
    const order = snap.data() as AssessmentOrder;
    if (expectedOwner !== undefined && (order.ownerUid ?? null) !== expectedOwner) throw new AssessmentError("This purchase was connected to an account. Sign in and reopen it from My tools.", 403);
    if (order.status !== "paid") throw new AssessmentError("Verified payment is required.", 403);
    if (revision !== order.revision) throw new AssessmentError("Your assessment changed in another tab. Reload to continue with the saved version.", 409);
    const patch: Partial<AssessmentOrder> = { revision: order.revision + 1 };
    if (action === "save" || action === "complete") {
      if (order.answers === null) throw new AssessmentError("This report is complete. Start a new assessment to answer again.");
      if (!validBrandAnswers(payload, action === "complete")) throw new AssessmentError("Choose a valid answer for each question.");
      patch.answers = payload;
      if (action === "complete") {
        const count = reportCount(order);
        // Upgrade old two-report orders without losing their answers or dates.
        if (order.completedCount === undefined) order.completed.forEach((run,index)=>tx.set(reportCollection(id).doc(reportId(index)),{...run,index}));
        tx.set(reportCollection(id).doc(reportId(count)),{answers:payload,completedAtMs:Date.now(),index:count});
        patch.completed = [];
        patch.completedCount = count + 1;
        patch.answers = null;
      }
    } else if (action === "retake") {
      if (!reportCount(order) || order.answers !== null) throw new AssessmentError("Finish your current assessment before starting another. Saved reports remain available.");
      patch.answers = {};
    } else if (action === "feedback") {
      const feedback = payload as { helpful?: unknown; comment?: unknown } | null;
      if (!reportCount(order) || !feedback || !Number.isInteger(feedback.helpful) || Number(feedback.helpful) < 1 || Number(feedback.helpful) > 5 || typeof feedback.comment !== "string" || feedback.comment.length > 1000) throw new AssessmentError("Choose a rating and keep feedback under 1,000 characters.");
      patch.feedback = { helpful: Number(feedback.helpful), comment: feedback.comment.trim(), createdAtMs: Date.now() };
    } else throw new AssessmentError("Unknown action.");
    tx.update(ref, patch);
    return { ...order, ...patch };
  });
  return assessmentView(await hydrateReports(updated));
}

export async function recentAssessmentOrders(): Promise<AssessmentOrder[]> {
  const snap = await orders().orderBy("createdAtMs", "desc").limit(100).get();
  return snap.docs.map(doc => doc.data() as AssessmentOrder);
}
