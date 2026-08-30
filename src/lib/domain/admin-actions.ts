"use server";

import { revalidatePath } from "next/cache";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

import { requireAdmin } from "../admin-auth";
import { isCategorySlug } from "../categories";
import { validateBio } from "../bio";
import { requireDb } from "../firebase/admin";
import { parseDollarsToCents } from "../money";
import { normalizeWebsite } from "../url";
import { buildListingSlug } from "../slug";
import { listingIdForWebsite } from "./payments";
import { MODERATION_MESSAGE, NAME_MESSAGE, screenWebsite, validateName } from "../moderation";
import { COLLECTIONS } from "./collections";
import { setActivityVisibilityForListing } from "./activity";
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
 * They can never edit a standing bid, a payment or a click total - those are
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

      // Restoring someone who never paid puts them back in the grid, not on the board.
      const restoreTo =
        status === "active" && (current.standingBidCents ?? 0) <= 0 ? "listed" : status;
      if (current.status === status) return;

      tx.update(ref, { status: restoreTo, updatedAt: Timestamp.now() });
      if (current.status === "active" || restoreTo === "active") {
        tx.set(
          db.collection(COLLECTIONS.stats).doc("site"),
          { listedCoaches: FieldValue.increment(restoreTo === "active" ? 1 : -1) },
          { merge: true },
        );
      }
    });
    await setActivityVisibilityForListing(id, status === "active");
  } catch (error) {
    console.error("[admin] setListingStatus failed:", error);
    return fail(error instanceof Error ? error.message : "Could not update that listing.");
  }

  revalidatePath("/admin/coaches");
  revalidatePath("/");
  return ok(status === "hidden" ? "Listing hidden." : "Listing restored.");
}

/**
 * Adds a coach directly, skipping the queue - for people approached personally rather
 * than people who found the enrolment form.
 *
 * They land in the grid, not on the leaderboard, because rank is the amount paid and they
 * have paid nothing. Paying moves them across on its own.
 */
export async function addCoachAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return fail("Not authorised.");
  }

  const parsed = normalizeWebsite(String(formData.get("website") ?? ""));
  if (!parsed.ok) return fail("Enter a valid website.");

  const siteFlag = screenWebsite(parsed.value.host);
  if (siteFlag) return fail(MODERATION_MESSAGE[siteFlag]);

  const nameResult = validateName(String(formData.get("name") ?? ""));
  if (!nameResult.ok) return fail(NAME_MESSAGE[nameResult.reason]);

  const category = String(formData.get("category") ?? "");
  if (!isCategorySlug(category)) return fail("Pick a category.");

  try {
    const db = requireDb();
    const id = listingIdForWebsite(parsed.value.normalized);
    const ref = db.collection(COLLECTIONS.listings).doc(id);
    const now = Timestamp.now();

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists) throw new Error("That website is already listed.");

      tx.create(ref, {
        name: nameResult.value,
        slug: buildListingSlug(nameResult.value),
        normalizedWebsite: parsed.value.normalized,
        displayWebsite: parsed.value.display,
        category,
        bio: "",
        standingBidCents: 0,
        standingBidReachedAt: now,
        totalClicks: 0,
        status: "listed",
        enrolledAt: now,
        createdAt: now,
        updatedAt: now,
      });
    });
  } catch (error) {
    console.error("[admin] createFoundingListing failed:", error);
    return fail(error instanceof Error ? error.message : "Could not add that coach.");
  }

  revalidatePath("/admin/coaches");
  revalidatePath("/admin");
  revalidatePath("/");
  return ok("Coach added to the grid.");
}

/**
 * Decides an enrolment. Approving puts a coach in the grid; declining hides them, which
 * keeps the record rather than deleting it so the same website cannot quietly re-apply
 * over and over.
 */
export async function decideEnrolmentAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return fail("Not authorised.");
  }

  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (!id || (decision !== "approve" && decision !== "decline")) return fail("Invalid request.");

  try {
    const db = requireDb();
    const ref = db.collection(COLLECTIONS.listings).doc(id);
    const snap = await ref.get();
    if (!snap.exists) return fail("That enrolment is gone.");
    if ((snap.data() as { status?: ListingStatus }).status !== "submitted") {
      return fail("That enrolment has already been decided.");
    }

    await ref.update({
      status: decision === "approve" ? "listed" : "hidden",
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error("[admin] decideEnrolment failed:", error);
    return fail("Could not update that enrolment.");
  }

  revalidatePath("/admin/coaches");
  revalidatePath("/admin");
  revalidatePath("/");
  return ok(decision === "approve" ? "Approved - they are in the grid." : "Declined.");
}

/**
 * Removes a listing nobody ever paid for. Every abandoned checkout leaves one behind, so
 * without this they accumulate for the life of the site.
 *
 * A listing with money behind it is never deletable here, and that is the point: the board
 * is the public record of what was paid, and the payments are its audit trail. Hide those
 * instead - hiding is reversible and leaves the record intact.
 */
export async function deleteUnpaidListingAction(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return fail("Not authorised.");
  }

  const id = String(formData.get("id") ?? "");
  if (!id) return fail("Invalid request.");

  try {
    const db = requireDb();
    const ref = db.collection(COLLECTIONS.listings).doc(id);
    const snap = await ref.get();
    if (!snap.exists) return fail("Listing not found.");

    const listing = snap.data() as { standingBidCents?: number; status?: ListingStatus };
    // Only a listing that reached the board has money behind it. Everything else -
    // submitted, listed, an abandoned checkout - never cost anyone anything.
    if ((listing.standingBidCents ?? 0) > 0 || listing.status === "active") {
      return fail("That listing has money behind it. Hide it instead.");
    }

    // The listing's own counter is not the authority here - the payment ledger is. A
    // reversed payment counts too: the money moved, even though it moved back.
    const payments = await db
      .collection(COLLECTIONS.bidPayments)
      .where("listingId", "==", id)
      .get();
    const settled = payments.docs.some((d) => {
      const status = (d.data() as { status?: string }).status;
      return status === "paid" || status === "reversed";
    });
    if (settled) return fail("That listing has a settled payment. Hide it instead.");

    // Checkouts that never completed are not an audit trail - nothing happened.
    const batch = db.batch();
    payments.docs.forEach((doc) => batch.delete(doc.ref));
    batch.delete(ref);
    await batch.commit();
  } catch (error) {
    console.error("[admin] deleteUnpaidListing failed:", error);
    return fail(error instanceof Error ? error.message : "Could not delete that listing.");
  }

  revalidatePath("/admin/coaches");
  revalidatePath("/admin");
  revalidatePath("/");
  return ok("Listing deleted.");
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
