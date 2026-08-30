import { jsonError, jsonOk, rateLimited } from "@/lib/api";
import { listingForEditToken, saveProfile, MAX_UPLOAD_BYTES } from "@/lib/domain/profile";
import { isFirebaseConfigured } from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A coach editing their own listing. The link they were sent is the whole authorisation -
 * there are no accounts here, and the token proves ownership without one.
 *
 * Nothing this endpoint can write moves a rank. Rank is bought, and only a signature
 * verified payment moves it.
 */
export async function POST(request: Request) {
  if (rateLimited(request, "profile", 10, 60_000)) {
    return jsonError("Too many attempts. Give it a moment.", 429);
  }
  if (!isFirebaseConfigured()) return jsonError("Editing is unavailable right now.", 503);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError("Invalid request.", 400);
  }

  const slug = String(form.get("slug") ?? "");
  const token = String(form.get("token") ?? "");
  const owner = await listingForEditToken(slug, token);
  // The same answer whether the listing is missing or the token is wrong, so this cannot
  // be used to discover which listings exist.
  if (!owner) return jsonError("That edit link is not valid.", 403);

  const file = form.get("photo");
  let photo: ArrayBuffer | null = null;
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_UPLOAD_BYTES) {
      return jsonError("That image is too large. Keep it under 6MB.", 400, { field: "photo" });
    }
    photo = await file.arrayBuffer();
  }

  const result = await saveProfile({
    listingId: owner.listing.id,
    bio: String(form.get("bio") ?? ""),
    photo,
  });
  if (!result.ok) return jsonError(result.message, 400);

  return jsonOk({ saved: true });
}
