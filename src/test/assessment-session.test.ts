import { beforeEach, describe, expect, it, vi } from "vitest";

const cookieState = vi.hoisted(() => ({ values: new Map<string, string>(), set: vi.fn(), delete: vi.fn() }));
vi.mock("@/lib/assessment-payment", () => ({reconcileAssessmentPayment:vi.fn(async()=>{})}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: (name: string) => cookieState.values.has(name) ? { value: cookieState.values.get(name) } : undefined, set: cookieState.set, delete: cookieState.delete }) }));
vi.mock("@/lib/brand-pdf", () => ({ createBrandPdf: vi.fn(async () => new Uint8Array([37, 80, 68, 70])) }));
vi.mock("@/lib/customer-auth", () => ({ getCustomerUser: vi.fn() }));
vi.mock("@/lib/admin-auth", () => ({ getAdminUser: vi.fn() }));
vi.mock("@/lib/firebase/admin", async () => { const { fakeDb } = await import("./fake-firestore"); return { requireDb: () => fakeDb }; });
vi.mock("@/lib/dodo", () => ({ assessmentProductId: () => "brand-product", isAssessmentCheckoutConfigured: () => true, createAssessmentCheckout: vi.fn() }));

import { createBrandPdf } from "@/lib/brand-pdf";
import { getCustomerUser } from "@/lib/customer-auth";
import { getAdminUser } from "@/lib/admin-auth";
import { createAssessmentCheckout } from "@/lib/dodo";
import { ASSESSMENT_PREVIEW_COOKIE, assessmentSession, preserveLegacyAssessmentPreview, setAssessmentAccess } from "@/lib/assessment-request";
import { ASSESSMENT_COOKIE, authorizedAssessment, createAssessmentOrder, createAssessmentPreview, processVerifiedAssessmentPayment, updateAssessment } from "@/lib/domain/assessments";
import { SAMPLE_ANSWERS } from "@/lib/brand-assessment";
import { POST as checkout } from "@/app/api/assessment/checkout/route";
import { POST as openPreview } from "@/app/api/admin/assessment-preview/route";
import { GET as readAssessment, POST as saveAssessment } from "@/app/api/assessment/route";
import { POST as restoreAccess } from "@/app/api/assessment/access/route";
import { GET as downloadReport } from "@/app/api/assessment/report/route";
import { GET as history } from "@/app/api/assessment/history/route";
import { fakeDb } from "./fake-firestore";

let requestCount = 0;
function request(path: string, body?: object) { return new Request(`https://coachrank.lol${path}`, { method: body ? "POST" : "GET", headers: { origin: "https://coachrank.lol", "Content-Type": "application/json", "x-forwarded-for": `session-test-${++requestCount}` }, ...(body ? { body: JSON.stringify(body) } : {}) }); }
async function purchase() {
  const result = await createAssessmentOrder("brand-product");
  await processVerifiedAssessmentPayment({ orderId: result.order.id, dodoPaymentId: `pay_${result.order.id}`, paidNetCents: 900, productCart: [{ product_id: "brand-product", quantity: 1 }] });
  return result;
}
beforeEach(() => {
  fakeDb.reset(); cookieState.values.clear(); vi.clearAllMocks();
  vi.mocked(getCustomerUser).mockResolvedValue({ uid: "buyer", email: "buyer@example.com", name: null });
  cookieState.set.mockImplementation((name: string, value: string) => cookieState.values.set(name, value));
  cookieState.delete.mockImplementation((name: string) => cookieState.values.delete(name));
  vi.mocked(getAdminUser).mockResolvedValue({ uid: "admin", email: "admin@example.com" });
  vi.mocked(createAssessmentCheckout).mockResolvedValue({ checkoutUrl: "https://checkout.dodopayments.com/session/example", sessionId: "checkout-example" });
});

describe("separate customer and admin preview sessions", () => {
  it("opens a paid customer order and a preview independently in the same browser", async () => {
    const paid = await purchase(), preview = await createAssessmentPreview();
    await setAssessmentAccess(paid.access); await setAssessmentAccess(preview.access, "preview");
    expect((await assessmentSession())?.order.id).toBe(paid.order.id);
    expect((await assessmentSession("preview"))?.order.id).toBe(preview.order.id);
    expect(cookieState.values.get(ASSESSMENT_COOKIE)).toBe(paid.access);
  });

  it("never treats an old preview cookie as a customer purchase", async () => {
    const preview = await createAssessmentPreview(); await setAssessmentAccess(preview.access);
    expect(await assessmentSession()).toBeNull();
    expect((await assessmentSession("preview"))?.order.id).toBe(preview.order.id);
    expect((await readAssessment(request("/api/assessment"))).status).toBe(401);
  });

  it("moves an old preview without losing its report, then opens actual checkout", async () => {
    const preview = await createAssessmentPreview();
    await updateAssessment(preview.order.id, 0, "complete", SAMPLE_ANSWERS);
    await setAssessmentAccess(preview.access);
    const response = await checkout(request("/api/assessment/checkout", { acceptedTerms: true }));
    expect(response.status).toBe(200);
    expect((await response.json()).checkoutUrl).toBe("https://checkout.dodopayments.com/session/example");
    expect(createAssessmentCheckout).toHaveBeenCalledOnce();
    expect(cookieState.values.get(ASSESSMENT_PREVIEW_COOKIE)).toBe(preview.access);
    expect(cookieState.delete).not.toHaveBeenCalled();
    expect((await authorizedAssessment(preview.access))?.completedCount).toBe(1);
    expect((await assessmentSession())?.order).toMatchObject({ status: "pending", preview: false });
  });

  it("does not bypass checkout when a separate preview cookie is present", async () => {
    const preview = await createAssessmentPreview(); await setAssessmentAccess(preview.access, "preview");
    const response = await checkout(request("/api/assessment/checkout", { acceptedTerms: true }));
    expect(response.status).toBe(200); expect(createAssessmentCheckout).toHaveBeenCalledOnce();
    expect((await response.json()).checkoutUrl).toContain("checkout.dodopayments.com");
  });

  it("takes a genuine existing buyer to their assessment without charging again", async () => {
    const paid = await purchase(), preview = await createAssessmentPreview();
    await setAssessmentAccess(paid.access); await setAssessmentAccess(preview.access, "preview");
    const response = await checkout(request("/api/assessment/checkout", { acceptedTerms: true }));
    expect((await response.json()).checkoutUrl).toBe(`/tools/brand-clarity/assessment?order=${paid.order.id}`);
    expect(createAssessmentCheckout).not.toHaveBeenCalled();
    expect(cookieState.values.get(ASSESSMENT_COOKIE)).toBe(paid.access);
  });

  it("resumes the saved admin preview without replacing an existing purchase", async () => {
    const paid = await purchase(), preview = await createAssessmentPreview();
    await setAssessmentAccess(paid.access); await setAssessmentAccess(preview.access, "preview");
    const count = fakeDb.all("assessmentOrders").length;
    const response = await openPreview(request("/api/admin/assessment-preview", {}));
    expect((await response.json()).url).toBe("/tools/brand-clarity/assessment?preview=true");
    expect(fakeDb.all("assessmentOrders")).toHaveLength(count);
    expect(cookieState.values.get(ASSESSMENT_COOKIE)).toBe(paid.access);
    expect(cookieState.values.get(ASSESSMENT_PREVIEW_COOKIE)).toBe(preview.access);
  });

  it("requires admin authentication even when someone holds a preview access link", async () => {
    const preview = await createAssessmentPreview(); await setAssessmentAccess(preview.access, "preview");
    vi.mocked(getAdminUser).mockResolvedValue(null);
    expect(await assessmentSession("preview")).toBeNull();
    expect((await readAssessment(request("/api/assessment?preview=true"))).status).toBe(401);
    expect((await history(request("/api/assessment/history?preview=true"))).status).toBe(403);
    expect((await downloadReport(request("/api/assessment/report?preview=true"))).status).toBe(403);
    expect((await restoreAccess(request("/api/assessment/access", { access: preview.access }))).status).toBe(403);
  });

  it("restores preview links into preview mode and preserves customer access", async () => {
    const paid = await purchase(), preview = await createAssessmentPreview(); await setAssessmentAccess(paid.access);
    const response = await restoreAccess(request("/api/assessment/access", { access: preview.access }));
    expect((await response.json()).url).toBe("/tools/brand-clarity/assessment?preview=true");
    expect(cookieState.values.get(ASSESSMENT_COOKIE)).toBe(paid.access);
    expect(cookieState.values.get(ASSESSMENT_PREVIEW_COOKIE)).toBe(preview.access);
  });

  it("restores purchased access without admin sign-in", async () => {
    const paid = await purchase(); vi.mocked(getAdminUser).mockResolvedValue(null);
    const response = await restoreAccess(request("/api/assessment/access", { access: paid.access }));
    expect((await response.json()).url).toBe("/tools/brand-clarity/assessment");
    expect(cookieState.values.get(ASSESSMENT_COOKIE)).toBe(paid.access);
  });

  it("saves answers and reads history only for the explicitly selected session", async () => {
    const paid = await purchase(), preview = await createAssessmentPreview();
    await setAssessmentAccess(paid.access); await setAssessmentAccess(preview.access, "preview");
    expect((await saveAssessment(request("/api/assessment?preview=true", { revision: 0, action: "complete", payload: SAMPLE_ANSWERS }))).status).toBe(200);
    const previewHistory = await history(request("/api/assessment/history?preview=true"));
    expect((await previewHistory.json()).reports).toHaveLength(1);
    const customerHistory = await history(request("/api/assessment/history"));
    expect((await customerHistory.json()).reports).toHaveLength(0);
    expect((await assessmentSession())?.order.revision).toBe(0);
  });


  it("creates a first preview without overwriting a buyer's access", async () => {
    const paid = await purchase(); await setAssessmentAccess(paid.access);
    const response = await openPreview(request("/api/admin/assessment-preview", {}));
    expect(response.status).toBe(200);
    expect(cookieState.values.get(ASSESSMENT_COOKIE)).toBe(paid.access);
    expect((await assessmentSession("preview"))?.order.preview).toBe(true);
    expect(fakeDb.all("assessmentOrders")).toHaveLength(2);
  });

  it("downloads the report from the selected preview or purchase without mixing answers", async () => {
    const paid = await purchase(), preview = await createAssessmentPreview();
    const otherAnswers = { ...SAMPLE_ANSWERS, "audience-1": 0 };
    await updateAssessment(paid.order.id, 0, "complete", SAMPLE_ANSWERS);
    await updateAssessment(preview.order.id, 0, "complete", otherAnswers);
    await setAssessmentAccess(paid.access); await setAssessmentAccess(preview.access, "preview");
    expect((await downloadReport(request("/api/assessment/report?preview=true"))).status).toBe(200);
    expect(vi.mocked(createBrandPdf).mock.calls.at(-1)?.[0]).toEqual(otherAnswers);
    expect((await downloadReport(request("/api/assessment/report"))).status).toBe(200);
    expect(vi.mocked(createBrandPdf).mock.calls.at(-1)?.[0]).toEqual(SAMPLE_ANSWERS);
  });

  it("migration never removes or changes a paid customer cookie", async () => {
    const paid = await purchase(); await setAssessmentAccess(paid.access);
    await preserveLegacyAssessmentPreview();
    expect(cookieState.values.get(ASSESSMENT_COOKIE)).toBe(paid.access);
    expect(cookieState.delete).not.toHaveBeenCalled();
  });
});
