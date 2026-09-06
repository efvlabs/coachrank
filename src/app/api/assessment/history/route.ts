import { currentAssessment } from "@/lib/assessment-request";
import { assessmentHistory } from "@/lib/domain/assessments";
import { jsonError, jsonOk, rateLimited } from "@/lib/api";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  if (rateLimited(request,"assessment-history",45,60_000)) return jsonError("Please wait before loading more reports.",429);
  const order = await currentAssessment();
  if (!order || order.status !== "paid") return jsonError("Open your private assessment to see its history.",403);
  const value = new URL(request.url).searchParams.get("before");
  const before = value === null ? undefined : Number(value);
  if (before !== undefined && (!Number.isInteger(before) || before < 0)) return jsonError("Choose a valid report.");
  return jsonOk({ reports: await assessmentHistory(order,before) },{headers:{"Cache-Control":"private, no-store"}});
}
