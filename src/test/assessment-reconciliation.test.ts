import {beforeEach,describe,expect,it,vi} from "vitest";
const calls=vi.hoisted(()=>({session:vi.fn(),payment:vi.fn()}));
vi.mock("@/lib/firebase/admin",async()=>{const {fakeDb}=await import("./fake-firestore");return {requireDb:()=>fakeDb};});
vi.mock("@/lib/dodo",async original=>({...await original<typeof import("@/lib/dodo")>(),getDodoClient:()=>({checkoutSessions:{retrieve:calls.session},payments:{retrieve:calls.payment}})}));
import {reconcileAssessmentPayment} from "@/lib/assessment-payment";
import {createAssessmentOrder,createAssessmentPreview,attachAssessmentCheckout,authorizedAssessment,reverseAssessmentPayment} from "@/lib/domain/assessments";
import {fakeDb} from "./fake-firestore";
async function fixture(){const p=await createAssessmentOrder("brand-product",{uid:"owner",email:"owner@example.com"});await attachAssessmentCheckout(p.order.id,"https://checkout.dodopayments.com/test","cks-test");calls.session.mockResolvedValue({payment_id:"pay_verified"});calls.payment.mockResolvedValue({payment_id:"pay_verified",status:"succeeded",metadata:{cr_kind:"assessment",cr_payment_id:p.order.id},currency:"USD",total_amount:900,tax:0,product_cart:[{product_id:"brand-product",quantity:1}]});return {...p,order:(await authorizedAssessment(p.access))!};}
beforeEach(()=>{fakeDb.reset();vi.clearAllMocks();});
describe("verified payment recovery",()=>{
 it("unlocks a delayed webhook from Dodo's authenticated response exactly once",async()=>{const p=await fixture();await reconcileAssessmentPayment(p.order);await reconcileAssessmentPayment(p.order);expect((await authorizedAssessment(p.access))?.status).toBe("paid");expect(fakeDb.all("processedWebhooks")).toHaveLength(1);});
 it("rejects another order's payment and incorrect price",async()=>{const p=await fixture();const payment=await calls.payment();for(const change of [{metadata:{cr_kind:"assessment",cr_payment_id:"f".repeat(32)}},{total_amount:899},{payment_id:"pay_other"}]){calls.payment.mockResolvedValue({...payment,...change});await expect(reconcileAssessmentPayment(p.order)).rejects.toThrow();expect((await authorizedAssessment(p.access))?.status).toBe("pending");}});
 it("never reopens a reversed purchase when refund arrives before success",async()=>{const p=await fixture();await reverseAssessmentPayment("pay_verified","refund-test");await reconcileAssessmentPayment(p.order);expect((await authorizedAssessment(p.access))?.status).toBe("reversed");});
 it("does not mistake an unfinished or failed payment for a purchase",async()=>{const p=await fixture();calls.session.mockResolvedValue({payment_id:null});await reconcileAssessmentPayment(p.order);expect((await authorizedAssessment(p.access))?.status).toBe("pending");calls.session.mockResolvedValue({payment_id:"pay_verified"});const payment=await calls.payment();calls.payment.mockResolvedValue({...payment,status:"failed"});await reconcileAssessmentPayment(p.order);expect((await authorizedAssessment(p.access))?.status).toBe("failed");});
 it("never makes a payment API call for admin previews",async()=>{const p=await createAssessmentPreview();await reconcileAssessmentPayment(p.order);expect(calls.session).not.toHaveBeenCalled();});
});
