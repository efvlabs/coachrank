import {beforeEach,describe,expect,it,vi} from "vitest";
const jar=vi.hoisted(()=>new Map<string,string>());
const privacy=vi.hoisted(()=>new Headers());
vi.mock("next/headers",()=>({cookies:async()=>({get:(k:string)=>jar.has(k)?{value:jar.get(k)}:undefined,set:(k:string,v:string)=>jar.set(k,v),delete:(k:string)=>jar.delete(k)}),headers:async()=>privacy}));
vi.mock("@/lib/admin-auth",()=>({getAdminUser:vi.fn(async()=>null)}));
vi.mock("@/lib/firebase/admin",async()=>{const {fakeDb}=await import("./fake-firestore");return {requireDb:()=>fakeDb};});
vi.mock("@/lib/domain/blog",()=>({getPublishedPostBySlug:vi.fn(async(slug:string)=>slug==="published-guide"?{slug}:null)}));
vi.mock("@/lib/assessment-request",()=>({sameOriginRequest:(r:Request)=>r.headers.get("origin")==="https://coachrank.lol"}));
import {publicJourneyPage,journeyAttribution,summarizeJourneys,JOURNEY_COOKIE,type Journey} from "@/lib/buying-journey";
import {requestJourneyId,recordVerifiedSignIn,buyingJourneyReport} from "@/lib/domain/buying-journeys";
import {createAssessmentOrder,createAssessmentPreview,attachAssessmentCheckout,processVerifiedAssessmentPayment,reverseAssessmentPayment,updateAssessment} from "@/lib/domain/assessments";
import {POST,DELETE} from "@/app/api/journey/route";
import {getAdminUser} from "@/lib/admin-auth";
import {SAMPLE_ANSWERS} from "@/lib/brand-assessment";
import {fakeDb} from "./fake-firestore";
let seq=0;
const req=(body:object,extra:Record<string,string>={})=>new Request("https://coachrank.lol/api/journey",{method:"POST",headers:{origin:"https://coachrank.lol","content-type":"application/json","x-forwarded-for":`journey-test-${++seq}`,...extra},body:JSON.stringify(body)});
beforeEach(()=>{fakeDb.reset();jar.clear();privacy.delete("dnt");privacy.delete("sec-gpc");vi.clearAllMocks();vi.mocked(getAdminUser).mockResolvedValue(null);});
describe("buying journey boundaries",()=>{
 it("never accepts private paths, query strings or arbitrary campaign values",()=>{
  for(const path of ["/admin","/my-tools","/tools/brand-clarity/assessment","/sign-in?oobCode=secret","/blog/private%2fsecret","//evil.example","/blog/a#token"])expect(publicJourneyPage(path)).toBeNull();
  expect(journeyAttribution({source:"alice@example.com",campaign:"private-token",content:"email@example.com",referrerHost:"www.reddit.com"})).toEqual({source:"reddit",medium:"social",campaign:"",content:""});
 });
 it("records a first source once, deduplicates reloads, and ignores browser conversion claims",async()=>{
  await POST(req({path:"/blog/published-guide",source:"reddit",campaign:"first-sale-2026-09",content:"reddit-audit",stage:"purchase_confirmed",email:"secret@example.com"}));
  const id=jar.get(JOURNEY_COOKIE)!;
  await POST(req({path:"/blog/published-guide",source:"x"}));await POST(req({path:"/tools/brand-clarity",source:"x"}));
  const j=fakeDb.peek("buyingJourneys",id)!;
  expect(j).toMatchObject({source:"reddit",firstArticle:"/blog/published-guide",campaign:"first-sale-2026-09"});
  expect(Object.keys(j.stages as object)).toEqual(["article_view","product_view"]);
  expect(JSON.stringify(j)).not.toContain("secret");expect(fakeDb.all("buyingJourneys")).toHaveLength(1);
 });
 it("does not measure drafts, admins, cross-origin requests or privacy opt-outs",async()=>{
  expect((await POST(req({path:"/tools"},{origin:"https://evil.example"}))).status).toBe(403);
  await POST(req({path:"/blog/unpublished"}));
  await POST(req({path:"/tools"},{"sec-gpc":"1"}));await POST(req({path:"/tools"},{dnt:"1"}));
  vi.mocked(getAdminUser).mockResolvedValue({email:"admin@example.com"} as Awaited<ReturnType<typeof getAdminUser>>);await POST(req({path:"/tools"}));
  vi.mocked(getAdminUser).mockResolvedValue(null);await DELETE(req({}));await POST(req({path:"/tools"}));
  expect(fakeDb.all("buyingJourneys")).toHaveLength(0);expect(jar.has(JOURNEY_COOKIE)).toBe(false);
 });
 it("does not bind orders to expired journeys or after a privacy signal",async()=>{
  await POST(req({path:"/tools"}));const id=jar.get(JOURNEY_COOKIE)!;expect(await requestJourneyId()).toBe(id);
  privacy.set("dnt","1");expect(await requestJourneyId()).toBeUndefined();privacy.delete("dnt");
  await fakeDb.collection("buyingJourneys").doc(id).update({expiresAtMs:Date.now()-1});expect(await requestJourneyId()).toBeUndefined();
 });
 it("keeps a successful sign-in independent of a measurement failure",async()=>{
  await POST(req({path:"/sign-in"}));const id=jar.get(JOURNEY_COOKIE)!;await recordVerifiedSignIn();expect((fakeDb.peek("buyingJourneys",id)?.stages as Record<string,number>).sign_in_completed).toBeTypeOf("number");
  const spy=vi.spyOn(fakeDb,"runTransaction").mockRejectedValueOnce(new Error("offline"));await expect(recordVerifiedSignIn()).resolves.toBeUndefined();spy.mockRestore();
 });
});
describe("authoritative delivery measurement",()=>{
 it("follows a pending checkout through verified payment and first completed report exactly once",async()=>{
  await POST(req({path:"/blog/published-guide",source:"x"}));await POST(req({path:"/tools/brand-clarity"}));await recordVerifiedSignIn();
  const p=await createAssessmentOrder("brand-product",{uid:"buyer",email:"buyer@example.com"},await requestJourneyId());
  await attachAssessmentCheckout(p.order.id,"https://checkout.dodopayments.com/fixture","session-fixture");
  expect((await buyingJourneyReport()).stages).toMatchObject({checkout_started:1,purchase_confirmed:0,report_completed:0});
  await expect(updateAssessment(p.order.id,0,"complete",SAMPLE_ANSWERS,"buyer")).rejects.toThrow("Verified payment");
  const payment={orderId:p.order.id,dodoPaymentId:"pay_fixture",paidNetCents:900,productCart:[{product_id:"brand-product",quantity:1}]};
  await expect(processVerifiedAssessmentPayment({...payment,paidNetCents:1})).rejects.toThrow();
  await processVerifiedAssessmentPayment(payment);await processVerifiedAssessmentPayment(payment);
  await updateAssessment(p.order.id,0,"complete",SAMPLE_ANSWERS,"buyer");
  await updateAssessment(p.order.id,1,"retake",null,"buyer");await updateAssessment(p.order.id,2,"complete",SAMPLE_ANSWERS,"buyer");
  const d=await buyingJourneyReport();expect(d).toMatchObject({paid:1,revenueCents:900,completed:1,unattributedPaid:0});expect(d.stages).toMatchObject({checkout_started:1,purchase_confirmed:1,report_completed:1});
  expect(d.sources[0]).toMatchObject({label:"x",purchase:1,report:1});
  await reverseAssessmentPayment("pay_fixture","refund_fixture");const reversed=await buyingJourneyReport();expect(reversed).toMatchObject({paid:0,revenueCents:0,reversed:1});expect(reversed.stages.purchase_confirmed).toBe(1);
 });
 it("excludes previews while retaining unmeasured verified purchases in sales totals",async()=>{
  await createAssessmentPreview();const p=await createAssessmentOrder("brand-product");await processVerifiedAssessmentPayment({orderId:p.order.id,dodoPaymentId:"pay_no_cookie",paidNetCents:900,productCart:[{product_id:"brand-product",quantity:1}]});
  expect(await buyingJourneyReport()).toMatchObject({paid:1,unattributedPaid:1,count:0});
 });
 it("does not imply every visitor followed the same sequence",()=>{
  const now=Date.now();const j:Journey={id:"a".repeat(32),startedAtMs:now,expiresAtMs:now+1000,entryPath:"/tools/brand-clarity",firstArticle:null,source:"direct",medium:"none",campaign:"",content:"",stages:{product_view:now}};
  const d=summarizeJourneys([j],[]);expect(d.stages.article_view).toBe(0);expect(d.stages.product_view).toBe(1);expect(d.articles[0].label).toBe("No recorded article");
 });
});
