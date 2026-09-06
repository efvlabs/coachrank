import { getAdminUser } from "@/lib/admin-auth";
import { jsonError, jsonOk } from "@/lib/api";
import { assessmentSession, preserveLegacyAssessmentPreview, sameOriginRequest, setAssessmentAccess } from "@/lib/assessment-request";
import { createAssessmentPreview } from "@/lib/domain/assessments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!sameOriginRequest(request) || !await getAdminUser()) return jsonError("Admin sign-in required.", 403);
  await preserveLegacyAssessmentPreview();
  const existing = await assessmentSession("preview");
  const access = existing?.access ?? (await createAssessmentPreview()).access;
  await setAssessmentAccess(access, "preview");
  return jsonOk({ url: "/tools/brand-clarity/assessment?preview=true" }, { headers: { "Cache-Control": "no-store" } });
}
