import { cookies } from "next/headers";
import { jsonError, jsonOk, rateLimited } from "@/lib/api";
import { sameOriginRequest } from "@/lib/assessment-request";
import { getAdminUser } from "@/lib/admin-auth";
import { publicJourneyPage, JOURNEY_COOKIE } from "@/lib/buying-journey";
import { recordJourneyPage } from "@/lib/domain/buying-journeys";
import { getPublishedPostBySlug } from "@/lib/domain/blog";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const options={headers:{"Cache-Control":"private, no-store"}};
export async function POST(request: Request) {
 if(!sameOriginRequest(request))return jsonError("Open CoachRank to continue.",403);
 if(rateLimited(request,"journey",40,60000))return jsonError("Please try again later.",429);
 const jar=await cookies();
 if(request.headers.get("sec-gpc")==="1"||request.headers.get("dnt")==="1"||jar.get("cr_measurement")?.value==="off"||await getAdminUser())return jsonOk({recorded:false},options);
 try{
  const text=await request.text();if(text.length>1500)return jsonError("Invalid measurement.");
  const input=JSON.parse(text);if(!input||typeof input!=="object"||Array.isArray(input))return jsonError("Invalid measurement.");
  const page=publicJourneyPage(input.path);if(!page)return jsonError("Invalid page.");
  if(page.stage==="article_view"&&!await getPublishedPostBySlug(page.path.slice(6)))return jsonOk({recorded:false},options);
  await recordJourneyPage(input,page);
  return jsonOk({recorded:true},options);
 }catch{console.warn("[journey] Page measurement unavailable");return jsonOk({recorded:false},options);}
}
export async function DELETE(request:Request){
 if(!sameOriginRequest(request))return jsonError("Open CoachRank to continue.",403);
 const jar=await cookies();jar.delete(JOURNEY_COOKIE);jar.set("cr_measurement","off",{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:365*86400});
 return jsonOk({},options);
}
