"use client";
import { publicJourneyPage, journeyAttribution } from "./buying-journey";
let pending:Promise<void>=Promise.resolve();
let lastPath="";
export function captureJourneyPage() {
 const page=publicJourneyPage(window.location.pathname);
 if(!page || window.location.search.includes("preview=true"))return pending;
 if(page.path===lastPath)return pending;
 lastPath=page.path;
 const query=new URLSearchParams(window.location.search);
 let referrerHost="";try{referrerHost=new URL(document.referrer).hostname;}catch{}
 const attribution=journeyAttribution({source:query.get("utm_source"),medium:query.get("utm_medium"),campaign:query.get("utm_campaign"),content:query.get("utm_content"),referrerHost});
 pending=pending.then(async()=>{
  try{const r=await fetch("/api/journey",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({path:page.path,...attribution}),keepalive:true,signal:AbortSignal.timeout(2500)});if(!r.ok)lastPath="";}catch{lastPath="";}
 });
 return pending;
}
