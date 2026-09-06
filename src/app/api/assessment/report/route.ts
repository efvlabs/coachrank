import { assessmentRun, reportCount } from "@/lib/domain/assessments";
import { currentAssessment } from "@/lib/assessment-request";
import { createBrandPdf } from "@/lib/brand-pdf";
import { jsonError, rateLimited } from "@/lib/api";
import { SAMPLE_ANSWERS } from "@/lib/brand-assessment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (rateLimited(request,"assessment-pdf",12,60_000)) return jsonError("Please wait before downloading again.",429);
  const url = new URL(request.url);
  const sample = url.searchParams.get("sample") === "true";
  let answers = SAMPLE_ANSWERS, previous, previousAtMs;
  let date = Date.UTC(2026,8,6);
  if (!sample) {
    const order = await currentAssessment();
    if (!order || order.status !== "paid") return jsonError("Open your private assessment before downloading.",403);
    const run = url.searchParams.has("run") ? Number(url.searchParams.get("run")) : reportCount(order)-1;
    const selected = await assessmentRun(order,run);
    if (!selected) return jsonError("Complete the assessment before downloading a report.",400);
    answers = selected.answers;
    date = selected.completedAtMs;
    const compare = url.searchParams.has("compare") ? Number(url.searchParams.get("compare")) : run-1;
    if (compare >= 0 && compare !== run) {
      const baseline = await assessmentRun(order,compare);
      if (!baseline) return jsonError("Choose an existing comparison report.",400);
      previous = baseline.answers;
      previousAtMs = baseline.completedAtMs;
    } else if (!Number.isInteger(compare) || compare < -1) return jsonError("Choose a valid comparison report.",400);

  }
  const pdf = await createBrandPdf(answers,date,previous,sample,previousAtMs);
  return new Response(Buffer.from(pdf), { headers: { "Content-Type":"application/pdf", "Content-Disposition":`attachment; filename="coachrank-brand-clarity${sample ? "-sample" : ""}.pdf"`, "Cache-Control":"private, no-store", "X-Content-Type-Options":"nosniff" } });
}
