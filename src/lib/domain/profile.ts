import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { Timestamp } from "firebase-admin/firestore";
import sharp from "sharp";

import { getDb, requireDb } from "../firebase/admin";
import { validateBio } from "../bio";
import { COLLECTIONS } from "./collections";
import { getListingBySlug } from "./listings";
import type { Listing } from "./types";

/** Square, small, and re-encoded by us - so nothing a coach uploads is served back verbatim. */
const PHOTO_PX = 320;
export const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;

export function newEditToken(): string {
  return randomBytes(24).toString("base64url");
}

/**
 * Compares an edit token without leaking, through timing, how much of it was right.
 * Both sides are hashed first so the comparison is over a fixed length.
 */
export function tokenMatches(supplied: string, stored: string | undefined): boolean {
  if (!stored || !supplied) return false;
  const a = createHash("sha256").update(supplied).digest();
  const b = createHash("sha256").update(stored).digest();
  return timingSafeEqual(a, b);
}

export type ProfileOwner = { listing: Listing; token: string };

/** Resolves the listing an edit link belongs to, or null if the link does not prove anything. */
export async function listingForEditToken(
  slug: string,
  token: string,
): Promise<ProfileOwner | null> {
  const db = getDb();
  if (!db || !slug || !token) return null;

  const listing = await getListingBySlug(slug);
  if (!listing) return null;

  const snap = await db.collection(COLLECTIONS.listings).doc(listing.id).get();
  const stored = (snap.data() as { editToken?: string } | undefined)?.editToken;
  if (!tokenMatches(token, stored)) return null;

  return { listing, token };
}

export type SaveProfileResult =
  | { ok: true }
  | { ok: false; message: string };

/**
 * Writes what a coach can change about themselves: their own words, and their own face.
 * Nothing here can move a rank - that is bought, and only a verified payment moves it.
 */
export async function saveProfile(args: {
  listingId: string;
  bio: string;
  photo?: ArrayBuffer | null;
}): Promise<SaveProfileResult> {
  const db = requireDb();
  const now = Timestamp.now();

  const trimmed = args.bio.trim();
  if (trimmed) {
    const result = validateBio(trimmed);
    if (!result.ok) {
      const { BIO_REJECTION_MESSAGE } = await import("../bio");
      return { ok: false, message: BIO_REJECTION_MESSAGE[result.reason] };
    }
  }

  const update: Record<string, unknown> = { bio: trimmed, updatedAt: now };

  if (args.photo && args.photo.byteLength > 0) {
    if (args.photo.byteLength > MAX_UPLOAD_BYTES) {
      return { ok: false, message: "That image is too large. Keep it under 6MB." };
    }
    let jpeg: Buffer;
    try {
      // Re-encoding is the sanitisation: whatever arrives leaves as a plain square JPEG,
      // stripped of EXIF - which for a phone photo includes where it was taken.
      jpeg = await sharp(Buffer.from(args.photo))
        .rotate()
        .resize(PHOTO_PX, PHOTO_PX, { fit: "cover", position: "attention" })
        .jpeg({ quality: 82, mozjpeg: true })
        .toBuffer();
    } catch {
      return { ok: false, message: "That file is not an image we can read." };
    }

    await db
      .collection(COLLECTIONS.listingPhotos)
      .doc(args.listingId)
      .set({ data: jpeg.toString("base64"), contentType: "image/jpeg", updatedAt: now });
    update.photoUpdatedAt = now;
  }

  await db.collection(COLLECTIONS.listings).doc(args.listingId).update(update);
  return { ok: true };
}

export type StoredPhoto = { buffer: Buffer; contentType: string };

export async function getListingPhoto(listingId: string): Promise<StoredPhoto | null> {
  const db = getDb();
  if (!db || !listingId) return null;
  try {
    const snap = await db.collection(COLLECTIONS.listingPhotos).doc(listingId).get();
    if (!snap.exists) return null;
    const doc = snap.data() as { data?: string; contentType?: string };
    if (!doc.data) return null;
    return {
      buffer: Buffer.from(doc.data, "base64"),
      contentType: doc.contentType ?? "image/jpeg",
    };
  } catch (error) {
    console.error("[profile] photo read failed:", error);
    return null;
  }
}

export async function deleteListingPhoto(listingId: string): Promise<void> {
  const db = requireDb();
  await db.collection(COLLECTIONS.listingPhotos).doc(listingId).delete();
  await db
    .collection(COLLECTIONS.listings)
    .doc(listingId)
    .update({ photoUpdatedAt: null, updatedAt: Timestamp.now() });
}
