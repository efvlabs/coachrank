import { beforeEach, describe, expect, it, vi } from "vitest";
import { PDFDocument } from "pdf-lib";

vi.mock("firebase-admin/firestore", async () => {
  const { FakeFieldValue, FakeTimestamp } = await import("./fake-firestore");
  return { FieldValue: FakeFieldValue, Timestamp: FakeTimestamp };
});
vi.mock("@/lib/firebase/admin", async () => {
  const { fakeDb } = await import("./fake-firestore");
  return { getDb:()=>fakeDb, requireDb:()=>fakeDb };
});

import { BRAND_DIMENSIONS, BRAND_QUESTIONS, SAMPLE_ANSWERS, brandReport, validBrandAnswers } from "@/lib/brand-assessment";
import { assessmentHistory, assessmentRun, assessmentView, authorizedAssessment, createAssessmentOrder, createAssessmentPreview, markAssessmentFailed, processVerifiedAssessmentPayment, reverseAssessmentPayment, updateAssessment } from "@/lib/domain/assessments";
import { createBrandPdf } from "@/lib/brand-pdf";
import { fakeDb } from "./fake-firestore";

beforeEach(()=>{ fakeDb.reset(); vi.useRealTimers(); });

describe("brand clarity scoring",()=>{
  it("covers six balanced dimensions and rejects partial, unknown or invalid answers",()=>{
    expect(BRAND_QUESTIONS).toHaveLength(24);
    expect(new Set(BRAND_QUESTIONS.map(question=>question.id)).size).toBe(24);
    for (const dimension of BRAND_DIMENSIONS) expect(BRAND_QUESTIONS.filter(question=>question.dimension===dimension.id)).toHaveLength(4);
    expect(validBrandAnswers(SAMPLE_ANSWERS,true)).toBe(true);
    expect(validBrandAnswers({},true)).toBe(false);
    expect(validBrandAnswers({...SAMPLE_ANSWERS,"audience-1":4},true)).toBe(false);
    expect(validBrandAnswers({...SAMPLE_ANSWERS,"audience-1":"3"},true)).toBe(false);
    expect(validBrandAnswers({...SAMPLE_ANSWERS,unexpected:2},true)).toBe(false);
    expect(()=>brandReport({})).toThrow();
  });
  it("uses fixed endpoints, stable tie ordering and explicit answer evidence",()=>{
    const zero=brandReport(Object.fromEntries(BRAND_QUESTIONS.map(question=>[question.id,0])));
    expect(zero.dimensions.map(dimension=>dimension.score)).toEqual([0,0,0,0,0,0]);
    expect(zero.priorities.map(dimension=>dimension.id)).toEqual(["audience","offer","difference"]);
    const top=brandReport(Object.fromEntries(BRAND_QUESTIONS.map(question=>[question.id,3])));
    expect(top.dimensions.every(dimension=>dimension.score===100)).toBe(true);
    expect(top.established).toBe(true);
    expect(brandReport(SAMPLE_ANSWERS).priorities[0].answer).toBeTruthy();
  });
});

async function paidOrder() {
  const result=await createAssessmentOrder("brand-product");
  await processVerifiedAssessmentPayment({orderId:result.order.id,dodoPaymentId:"pay_brand",paidNetCents:900,productCart:[{product_id:"brand-product",quantity:1}]});
  return result;
}

describe("private assessment purchases",()=>{
  it("requires the private token, not just a known order id",async()=>{
    const {order,access}=await createAssessmentOrder("brand-product");
    expect(await authorizedAssessment(access)).toMatchObject({id:order.id,status:"pending"});
    expect(await authorizedAssessment(order.id)).toBeNull();
    expect(await authorizedAssessment(`${order.id}.${"a".repeat(64)}`)).toBeNull();
    expect(assessmentView(order)).not.toHaveProperty("accessHash");
    expect(assessmentView(order)).not.toHaveProperty("productId");
  });
  it("cannot save or complete an unpaid order",async()=>{
    const {order}=await createAssessmentOrder("brand-product");
    await expect(updateAssessment(order.id,0,"complete",SAMPLE_ANSWERS)).rejects.toThrow("Verified payment");
  });
  it("requires a matching product, quantity and exact net USD amount",async()=>{
    const {order}=await createAssessmentOrder("brand-product");
    for (const patch of [{paidNetCents:899},{paidNetCents:null},{productCart:[{product_id:"bid-product",quantity:1}]},{productCart:[{product_id:"brand-product",quantity:2}]},{productCart:undefined}]) {
      await expect(processVerifiedAssessmentPayment({orderId:order.id,dodoPaymentId:"pay_mismatch",paidNetCents:900,productCart:[{product_id:"brand-product",quantity:1}],...patch})).rejects.toThrow("did not match");
    }
    expect(fakeDb.peek("assessmentOrders",order.id)).toMatchObject({status:"pending"});
  });
  it("unlocks only once and keeps product purchases out of board totals",async()=>{
    const {order}=await paidOrder();
    const repeat=await processVerifiedAssessmentPayment({orderId:order.id,dodoPaymentId:"pay_brand",paidNetCents:900,productCart:[{product_id:"brand-product",quantity:1}]});
    expect(repeat.outcome).toBe("already_processed");
    expect(fakeDb.peek("assessmentOrders",order.id)).toMatchObject({status:"paid"});
    expect(fakeDb.all("stats")).toHaveLength(0);
    expect(fakeDb.all("listings")).toHaveLength(0);
    expect(fakeDb.all("processedWebhooks")).toHaveLength(1);
  });
  it("a late failure cannot revoke a verified purchase",async()=>{
    const {order}=await paidOrder();
    await markAssessmentFailed(order.id);
    expect(fakeDb.peek("assessmentOrders",order.id)).toMatchObject({status:"paid"});
  });
  it("revokes access on refund and hides the report from the public view",async()=>{
    const {order,access}=await paidOrder();
    await updateAssessment(order.id,0,"complete",SAMPLE_ANSWERS);
    await reverseAssessmentPayment("pay_brand","refund_1");
    const revoked=(await authorizedAssessment(access))!;
    expect(assessmentView(revoked)).toMatchObject({status:"reversed",answers:null,completed:[]});
    await expect(updateAssessment(order.id,1,"retake",null)).rejects.toThrow("Verified payment");
  });
  it("does not unlock a refund that arrived before success",async()=>{
    const {order}=await createAssessmentOrder("brand-product");
    await reverseAssessmentPayment("pay_brand","refund_early");
    expect((await processVerifiedAssessmentPayment({orderId:order.id,dodoPaymentId:"pay_brand",paidNetCents:900,productCart:[{product_id:"brand-product",quantity:1}]})).outcome).toBe("already_reversed");
    expect(fakeDb.peek("assessmentOrders",order.id)).toMatchObject({status:"reversed"});
  });
  it("marks admin previews explicitly and creates no payment ledger",async()=>{
    const {order}=await createAssessmentPreview();
    expect(order).toMatchObject({preview:true,status:"paid",productId:"admin-preview"});
    expect(fakeDb.all("processedWebhooks")).toHaveLength(0);
  });
});

describe("saved progress and reassessment",()=>{
  it("saves partial progress and rejects an older tab overwriting it",async()=>{
    const {order,access}=await paidOrder();
    const saved=await updateAssessment(order.id,0,"save",{"audience-1":2});
    expect(saved).toMatchObject({revision:1,answers:{"audience-1":2}});
    await expect(updateAssessment(order.id,0,"save",{"audience-1":0})).rejects.toThrow("another tab");
    expect((await authorizedAssessment(access))!.answers).toEqual({"audience-1":2});
  });
  it("preserves every report and permits a third assessment",async()=>{
    const {order}=await paidOrder();
    const initial=await updateAssessment(order.id,0,"complete",SAMPLE_ANSWERS);
    expect(initial.completed).toHaveLength(1);
    expect(initial.answers).toBeNull();
    expect(initial.canRetake).toBe(true);
    await expect(updateAssessment(order.id,1,"save",SAMPLE_ANSWERS)).rejects.toThrow("complete");
    const retake=await updateAssessment(order.id,1,"retake",null);
    expect(retake.answers).toEqual({});
    const changed={...SAMPLE_ANSWERS,"audience-1":3};
    const final=await updateAssessment(order.id,2,"complete",changed);
    expect(final.completed[0].answers).toEqual(SAMPLE_ANSWERS);
    expect(final.completed[1].answers).toEqual(changed);
    expect(final.canRetake).toBe(true);
    await updateAssessment(order.id,3,"retake",null);
    const third=await updateAssessment(order.id,4,"complete",SAMPLE_ANSWERS);
    expect(third.completedCount).toBe(3);
    expect(third.completed.map(run=>run.index)).toEqual([0,1,2]);
  });
  it("allows a retake years after purchase without losing earlier reports",async()=>{
    vi.useFakeTimers();
    const {order,access}=await paidOrder();
    await updateAssessment(order.id,0,"complete",SAMPLE_ANSWERS);
    vi.setSystemTime(Date.now()+730*86_400_000);
    await updateAssessment(order.id,1,"retake",null);
    const saved=assessmentView((await authorizedAssessment(access))!);
    expect(saved.completed).toHaveLength(1);
    expect(saved.canRetake).toBe(false);
  });
  it("accepts bounded feedback only after a completed report",async()=>{
    const {order}=await paidOrder();
    await expect(updateAssessment(order.id,0,"feedback",{helpful:5,comment:"Useful"})).rejects.toThrow();
    await updateAssessment(order.id,0,"complete",SAMPLE_ANSWERS);
    await expect(updateAssessment(order.id,1,"feedback",{helpful:6,comment:""})).rejects.toThrow();
    expect((await updateAssessment(order.id,1,"feedback",{helpful:4,comment:" A concrete next step. "})).feedbackSubmitted).toBe(true);
  });
  it("lets an unfinished reassessment resume years later",async()=>{
    vi.useFakeTimers();
    const {order,access}=await paidOrder();
    await updateAssessment(order.id,0,"complete",SAMPLE_ANSWERS);
    await updateAssessment(order.id,1,"retake",null);
    vi.setSystemTime(Date.now()+730*86_400_000);
    const saved=assessmentView((await authorizedAssessment(access))!);
    expect(saved.answers).toEqual({});
    expect(saved.completed).toHaveLength(1);
    expect((await updateAssessment(order.id,2,"complete",SAMPLE_ANSWERS)).completedCount).toBe(2);
  });
  it("pages long histories without growing the order document or exposing another purchase",async()=>{
    const {order,access}=await paidOrder();
    let revision=0;
    for(let index=0;index<23;index++){
      if(index) await updateAssessment(order.id,revision++,"retake",null);
      await updateAssessment(order.id,revision++,"complete",{...SAMPLE_ANSWERS,"audience-1":index%4});
    }
    const saved=(await authorizedAssessment(access))!;
    expect(saved.completed).toHaveLength(20);
    expect(saved.completed[0].index).toBe(3);
    expect(assessmentView(saved).completedCount).toBe(23);
    const older=await assessmentHistory(saved,3);
    expect(older.map(run=>run.index)).toEqual([0,1,2]);
    expect((await assessmentRun(saved,0))?.answers["audience-1"]).toBe(0);
    expect((await assessmentRun(saved,22))?.answers["audience-1"]).toBe(2);
    expect(fakeDb.peek("assessmentOrders",order.id)?.completed).toEqual([]);
    const other=await createAssessmentPreview();
    expect(await assessmentRun(other.order,0)).toBeNull();
    expect(await assessmentRun(saved,23)).toBeNull();
    await reverseAssessmentPayment("pay_brand","refund_many");
    const reversed=(await authorizedAssessment(access))!;
    expect(await assessmentHistory(reversed)).toEqual([]);
    expect(await assessmentRun(reversed,0)).toBeNull();
  });
  it("upgrades legacy buyers and preserves both original reports and dates",async()=>{
    const {order,access}=await paidOrder();
    const legacy={...order,status:"paid",answers:null,completed:[{answers:SAMPLE_ANSWERS,completedAtMs:100},{answers:SAMPLE_ANSWERS,completedAtMs:200}]};
    delete legacy.completedCount;
    await fakeDb.collection("assessmentOrders").doc(order.id).set(legacy);
    expect(assessmentView((await authorizedAssessment(access))!).canRetake).toBe(true);
    await updateAssessment(order.id,0,"retake",null);
    const saved=await updateAssessment(order.id,1,"complete",SAMPLE_ANSWERS);
    expect(saved.completedCount).toBe(3);
    expect(saved.completed.map(run=>run.completedAtMs).slice(0,2)).toEqual([100,200]);
    expect(fakeDb.peek("assessmentOrders",order.id)?.completed).toEqual([]);
  });

});

it("exports a real PDF with complete report sections",async()=>{
  const bytes=await createBrandPdf(SAMPLE_ANSWERS,Date.UTC(2026,8,6));
  const document=await PDFDocument.load(bytes);
  expect(document.getTitle()).toBe("Your Brand Clarity Report - CoachRank");
  expect(document.getPageCount()).toBeGreaterThanOrEqual(4);
  expect(document.getPageCount()).toBeLessThanOrEqual(9);
  expect(Buffer.from(bytes).subarray(0,5).toString()).toBe("%PDF-");
});
