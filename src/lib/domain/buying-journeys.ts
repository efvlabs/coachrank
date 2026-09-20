import "server-only";
import { randomBytes } from "node:crypto";
import { Timestamp } from "firebase-admin/firestore";
import { cookies, headers } from "next/headers";
import { getAdminUser } from "../admin-auth";
import { JOURNEY_COOKIE, JOURNEY_DAYS, journeyAttribution, summarizeJourneys, type BrowserStage, type Journey } from "../buying-journey";
import { requireDb } from "../firebase/admin";
import type { AssessmentOrder } from "./assessments";

const collection=()=>requireDb().collection("buyingJourneys");
const validId=(value:unknown):value is string=>typeof value === "string" && /^[a-f0-9]{32}$/.test(value);
export async function requestJourneyId(): Promise<string | undefined> {
 try {
  const h=await headers();
  if(h.get("sec-gpc")==="1" || h.get("dnt")==="1" || await getAdminUser())return undefined;
  const jar=await cookies();if(jar.get("cr_measurement")?.value==="off")return undefined;
  const id=jar.get(JOURNEY_COOKIE)?.value;
  if(!validId(id))return undefined;
  const snap=await collection().doc(id).get();
  const data=snap.data() as Journey | undefined;
  return data && data.expiresAtMs>Date.now() ? id : undefined;
 }catch{return undefined;}
}
export async function recordJourneyPage(input: Record<string,unknown>, page: {path:string;stage:BrowserStage|null}) {
 const jar=await cookies();
 const existing=await requestJourneyId();
 const id=existing ?? randomBytes(16).toString("hex");
 const now=Date.now();
 await requireDb().runTransaction(async tx=>{
  const ref=collection().doc(id);const snap=await tx.get(ref);const current=snap.data() as Journey | undefined;
  if(current && current.expiresAtMs>now){
   const patch:Record<string,unknown>={};
   if(page.stage && current.stages[page.stage]===undefined)patch[`stages.${page.stage}`]=now;
   if(page.stage==="article_view" && !current.firstArticle)patch.firstArticle=page.path;
   if(Object.keys(patch).length)tx.update(ref,patch);
  }else{
   tx.set(ref,{id,startedAtMs:now,expiresAtMs:now+JOURNEY_DAYS*86400000,expiresAt:Timestamp.fromMillis(now+90*86400000),entryPath:page.path,firstArticle:page.stage==="article_view"?page.path:null,...journeyAttribution(input),stages:page.stage?{[page.stage]:now}:{}});
  }
 });
 if(!existing)jar.set(JOURNEY_COOKIE,id,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:JOURNEY_DAYS*86400});
}
export async function recordVerifiedSignIn() {
 try{
  const id=await requestJourneyId();if(!id)return;
  await requireDb().runTransaction(async tx=>{const ref=collection().doc(id);const snap=await tx.get(ref);const j=snap.data() as Journey|undefined;if(j && !j.stages.sign_in_completed)tx.update(ref,{"stages.sign_in_completed":Date.now()});});
 }catch{console.warn("[journey] Sign-in measurement unavailable");}
}
export async function buyingJourneyReport(days=30) {
 const since=Date.now()-days*86400000;
 const [journeys,orders]=await Promise.all([
  collection().where("startedAtMs",">=",since).orderBy("startedAtMs","desc").limit(5001).get(),
  requireDb().collection("assessmentOrders").where("createdAtMs",">=",since).orderBy("createdAtMs","desc").limit(5001).get(),
 ]);
 return {...summarizeJourneys(journeys.docs.slice(0,5000).map(d=>d.data() as Journey),orders.docs.slice(0,5000).map(d=>d.data() as AssessmentOrder)),count:journeys.size,limited:journeys.size>5000||orders.size>5000,days};
}
