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
  let answers = SAMPLE_ANSWERS, previous;
  let date = Date.UTC(2026,8,6);
  if (!sample) {
    const order = await currentAssessment();
    if (!order || order.status !== "paid") return jsonError("Open your private assessment before downloading.",403);
    const run = url.searchParams.has("run") ? Number(url.searchParams.get("run")) : order.completed.length-1;
    if (!Number.isInteger(run) || run < 0 || run >= order.completed.length) return jsonError("Complete the assessment before downloading a report.",400);
    answers = order.completed[run].answers;
    date = order.completed[run].completedAtMs;
    if (run > 0) previous = order.completed[0].answers;
  }
  const pdf = await createBrandPdf(answers,date,previous,sample);
  return new Response(Buffer.from(pdf), { headers: { "Content-Type":"application/pdf", "Content-Disposition":`attachment; filename="coachrank-brand-clarity${sample ? "-sample" : ""}.pdf"`, "Cache-Control":"private, no-store", "X-Content-Type-Options":"nosniff" } });
}
