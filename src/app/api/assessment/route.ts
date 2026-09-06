import { cookies } from "next/headers";
import { jsonError, jsonOk, rateLimited, readJson } from "@/lib/api";
import { currentAssessment, sameOriginRequest } from "@/lib/assessment-request";
import { ASSESSMENT_COOKIE, AssessmentError, assessmentView, updateAssessment } from "@/lib/domain/assessments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  if (rateLimited(request, "assessment-read", 90, 60_000)) return jsonError("Please wait before checking again.", 429);
  const order = await currentAssessment();
  if (!order) return jsonError("Open your private access link or purchase the assessment to continue.", 401);
  const access = (await cookies()).get(ASSESSMENT_COOKIE)!.value;
  return jsonOk({ order: assessmentView(order), ...(order.status === "paid" ? { accessLink: `/tools/brand-clarity/access#${access}` } : {}) }, { headers });
}

export async function POST(request: Request) {
  if (!sameOriginRequest(request)) return jsonError("Open your assessment on CoachRank.", 403);
  if (rateLimited(request, "assessment-save", 30, 60_000)) return jsonError("Please wait before saving again.", 429);
  const order = await currentAssessment();
  if (!order) return jsonError("Your assessment access could not be verified.", 401);
  const body = await readJson<{ revision?: number; action?: string; payload?: unknown }>(request);
  if (!body || !Number.isInteger(body.revision) || typeof body.action !== "string") return jsonError("Invalid assessment request.");
  try {
    const result = await updateAssessment(order.id, body.revision!, body.action, body.payload);
    return jsonOk({ order: result }, { headers });
  } catch (error) {
    if (error instanceof AssessmentError) return jsonError(error.message, error.status);
    console.error("[assessment] save failed", error instanceof Error ? error.message : "unknown error");
    return jsonError("Your changes could not be saved. Please try again.", 500);
  }
}
