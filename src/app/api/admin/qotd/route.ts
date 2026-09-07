import { getAdminUser } from "@/lib/admin-auth";
import { jsonError, jsonOk, rateLimit } from "@/lib/api";
import { sameOriginRequest } from "@/lib/assessment-request";
import { QotdConflict, saveQotd } from "@/lib/domain/qotd";
import { validateQotd } from "@/lib/qotd";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getAdminUser();
  if (!sameOriginRequest(request) || !user) return jsonError("Admin sign-in required.", 403);
  if (!rateLimit(`qotd:${user.uid}`, 60, 60_000)) return jsonError("Please wait a minute before saving again.", 429);
  let input;
  try {
    const text = await request.text();
    if (text.length > 10000) return jsonError("This quote record is too large.", 413);
    input = validateQotd(JSON.parse(text));
  } catch (error) { return jsonError(error instanceof Error ? error.message : "Check your quote fields."); }
  try {
    return jsonOk({ record: await saveQotd(input) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof QotdConflict) return jsonError(error.message, 409);
    console.error("[qotd] Save failed", error);
    return jsonError("Could not save. Your text is still here. Please try again.", 503);
  }
}
