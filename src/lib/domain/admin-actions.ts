"use server";

import { revalidatePath } from "next/cache";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { requireAdmin } from "../admin-auth";
import { isCategorySlug } from "../categories";
import { validateBio } from "../bio";
import { requireDb } from "../firebase/admin";
import { parseDollarsToCents } from "../money";
import { validateName } from "../moderation";
import { COLLECTIONS } from "./collections";
import { createPost, deletePost, updatePost, validateBlogInput } from "./blog";
import { updatePricing } from "./settings";
import type { ListingStatus } from "./types";

export type ActionResult = { ok: boolean; message: string };

function ok(message: string): ActionResult {
  return { ok: true, message };
}
function fail(message: string): ActionResult {
  return { ok: false, message };
}

// ---------------------------------------------------------------------------
// Coaches
// ---------------------------------------------------------------------------

/**
 * Admins may fix a typo, correct a mis-filed category and moderate a listing.
 * They can never edit a standing bid, a payment or a click total — those are
 * derived from verified payments and nothing else.
 */
export async function updateListingAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return fail("Not authorised.");
  }

  const id = String(formData.get("id") ?? "");
  if (!id) return fail("Missing listing.");

  const nameResult = validateName(String(formData.get("name") ?? ""));
  if (!nameResult.ok) return fail("That name is not valid.");

  const bioResult = validateBio(String(formData.get("bio") ?? ""));
  if (!bioResult.ok) return fail("That bio is not valid (30 words maximum, plain text).");

  const category = String(formData.get("category") ?? "");
  if (!isCategorySlug(category)) return fail("Pick a valid category.");

  try {
    await requireDb()
      .collection(COLLECTIONS.listings)
      .doc(id)
      .update({
        name: nameResult.value,
        bio: bioResult.value,
        category,
        updatedAt: Timestamp.now(),
      });
  } catch (error) {
    console.error("[admin] updateListing failed:", error);
    return fail("Could not save that listing.");
  }

  revalidatePath("/admin/coaches");
  revalidatePath("/");
  return ok("Listing saved.");
}

export async function setListingStatusAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return fail("Not authorised.");
  }

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as ListingStatus;
  if (!id || !["active", "hidden"].includes(status)) return fail("Invalid request.");

  try {
    const db = requireDb();
    await db.runTransaction(async (tx) => {
      const ref = db.collection(COLLECTIONS.listings).doc(id);
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error("Listing not found.");
      const current = snap.data() as { status: ListingStatus; standingBidCents?: number };

      // A listing with no verified payment cannot be published by an admin either.
      if (status === "active" && (current.standingBidCents ?? 0) <= 0) {
        throw new Error("That listing has no verified payment behind it.");
      }
      if (current.status === status) return;

      tx.update(ref, { status, updatedAt: Timestamp.now() });
      tx.set(
        db.collection(COLLECTIONS.stats).doc("site"),
        { listedCoaches: FieldValue.increment(status === "active" ? 1 : -1) },
        { merge: true },
      );
    });
  } catch (error) {
    console.error("[admin] setListingStatus failed:", error);
    return fail(error instanceof Error ? error.message : "Could not update that listing.");
  }

  revalidatePath("/admin/coaches");
  revalidatePath("/");
  return ok(status === "hidden" ? "Listing hidden." : "Listing restored.");
}

// ---------------------------------------------------------------------------
// Blog
// ---------------------------------------------------------------------------

function blogInputFrom(formData: FormData) {
  return {
    title: String(formData.get("title") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    excerpt: String(formData.get("excerpt") ?? ""),
    markdownBody: String(formData.get("markdownBody") ?? ""),
    seoTitle: String(formData.get("seoTitle") ?? ""),
    metaDescription: String(formData.get("metaDescription") ?? ""),
    ctaCategory: String(formData.get("ctaCategory") ?? "") || null,
    status: (String(formData.get("status") ?? "draft") === "published" ? "published" : "draft") as
      | "draft"
      | "published",
  };
}

export async function savePostAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return fail("Not authorised.");
  }

  const parsed = validateBlogInput(blogInputFrom(formData));
  if (!parsed.ok) return fail(parsed.errors.map((e) => e.message).join(" "));

  const id = String(formData.get("id") ?? "");

  try {
    if (id) await updatePost(id, parsed.value);
    else await createPost(parsed.value);
  } catch (error) {
    console.error("[admin] savePost failed:", error);
    return fail(error instanceof Error ? error.message : "Could not save that post.");
  }

  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  revalidatePath(`/blog/${parsed.value.slug}`);
  return ok(parsed.value.status === "published" ? "Published." : "Draft saved.");
}

export async function deletePostAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return fail("Not authorised.");
  }

  const id = String(formData.get("id") ?? "");
  if (!id) return fail("Missing post.");

  try {
    await deletePost(id);
  } catch (error) {
    console.error("[admin] deletePost failed:", error);
    return fail("Could not delete that post.");
  }

  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  return ok("Post deleted.");
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

const PRICING_FIELDS = [
  "minNewBidCents",
  "topPositionIncrementCents",
  "standardIncrementCents",
  "premiumSpotlightCents",
  "standardSpotlightCents",
] as const;

export async function updatePricingAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return fail("Not authorised.");
  }

  const patch: Record<string, number> = {};
  for (const field of PRICING_FIELDS) {
    const cents = parseDollarsToCents(String(formData.get(field) ?? ""));
    if (cents === null) return fail(`Enter a valid dollar amount for every field.`);
    if (cents <= 0) return fail("Every price must be greater than zero.");
    patch[field] = cents;
  }

  try {
    await updatePricing(patch);
  } catch (error) {
    console.error("[admin] updatePricing failed:", error);
    return fail("Could not save those prices.");
  }

  revalidatePath("/admin/settings");
  revalidatePath("/");
  revalidatePath("/rules");
  return ok("Pricing updated.");
}
