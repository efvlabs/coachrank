import { getAdminUser } from "@/lib/admin-auth";
import { jsonError, jsonOk } from "@/lib/api";
import { sameOriginRequest, setAssessmentAccess } from "@/lib/assessment-request";
import { createAssessmentPreview } from "@/lib/domain/assessments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!sameOriginRequest(request) || !await getAdminUser()) return jsonError("Admin sign-in required.", 403);
  const { access } = await createAssessmentPreview();
  await setAssessmentAccess(access);
  return jsonOk({ url: "/tools/brand-clarity/assessment" }, { headers: { "Cache-Control": "no-store" } });
}
