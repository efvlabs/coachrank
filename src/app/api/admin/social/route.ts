import { getAdminUser } from "@/lib/admin-auth";
import { jsonError, jsonOk, rateLimit } from "@/lib/api";
import { sameOriginRequest } from "@/lib/assessment-request";
import { saveSocialRecord, SocialConflict } from "@/lib/domain/social";
import { validateSocialInput } from "@/lib/social";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getAdminUser();
  if (!sameOriginRequest(request) || !user) return jsonError("Admin sign-in required.", 403);
  if (!rateLimit(`social:${user.uid}`, 60, 60_000)) return jsonError("Please wait a minute before saving again.", 429);
  let input;
  try {
    const text = await request.text();
    if (text.length > 30000) return jsonError("Keep this record under 30,000 characters.", 413);
    input = validateSocialInput(JSON.parse(text));
  } catch (error) { return jsonError(error instanceof Error ? error.message : "Check the record fields."); }
  try {
    return jsonOk({ record: await saveSocialRecord(input) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof SocialConflict) return jsonError(error.message, 409);
    console.error("[social] Save failed", error);
    return jsonError("Could not save. Your draft is still open. Please try again.", 503);
  }
}
