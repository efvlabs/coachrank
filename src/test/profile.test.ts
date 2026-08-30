import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("firebase-admin/firestore", async () => {
  const { FakeFieldValue, FakeTimestamp } = await import("./fake-firestore");
  return { FieldValue: FakeFieldValue, Timestamp: FakeTimestamp };
});

vi.mock("@/lib/firebase/admin", async () => {
  const { fakeDb } = await import("./fake-firestore");
  return {
    getDb: () => fakeDb,
    requireDb: () => fakeDb,
    getAdminApp: () => ({}),
    getAdminAuth: () => null,
    isFirebaseConfigured: () => true,
  };
});

import sharp from "sharp";

import { COLLECTIONS } from "@/lib/domain/collections";
import { ensureListing, type EnsureListingInput } from "@/lib/domain/payments";
import {
  getListingPhoto,
  listingForEditToken,
  newEditToken,
  saveProfile,
  tokenMatches,
} from "@/lib/domain/profile";
import { fakeDb } from "./fake-firestore";

const SARAH: EnsureListingInput = {
  name: "Sarah Chen",
  normalizedWebsite: "sarahchen.com",
  displayWebsite: "https://sarahchen.com",
  category: "business",
  bio: "",
};

async function listed() {
  const { listingId, listing } = await ensureListing(SARAH);
  const token = newEditToken();
  await fakeDb
    .collection(COLLECTIONS.listings)
    .doc(listingId)
    .update({ status: "listed", editToken: token });
  return { listingId, slug: listing.slug, token };
}

const portrait = () =>
  sharp({ create: { width: 900, height: 1200, channels: 3, background: { r: 200, g: 140, b: 90 } } })
    .jpeg()
    .toBuffer()
    .then((b) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer);

beforeEach(() => fakeDb.reset());

describe("proving a listing is yours", () => {
  it("accepts the token it was given", () => {
    const token = newEditToken();
    expect(tokenMatches(token, token)).toBe(true);
  });

  it("refuses a wrong token, a missing one, and a prefix of the right one", () => {
    const token = newEditToken();
    expect(tokenMatches("wrong", token)).toBe(false);
    expect(tokenMatches("", token)).toBe(false);
    expect(tokenMatches(token, undefined)).toBe(false);
    expect(tokenMatches(token.slice(0, -1), token)).toBe(false);
  });

  it("resolves the listing behind a good link", async () => {
    const { slug, token, listingId } = await listed();
    const owner = await listingForEditToken(slug, token);
    expect(owner?.listing.id).toBe(listingId);
  });

  it("answers the same way for a bad token and a listing that does not exist", async () => {
    const { slug, token } = await listed();
    expect(await listingForEditToken(slug, "not-the-token")).toBeNull();
    expect(await listingForEditToken("no-such-coach", token)).toBeNull();
  });
});

describe("what a coach can save", () => {
  it("stores the bio", async () => {
    const { listingId } = await listed();
    const result = await saveProfile({ listingId, bio: "  I help founders sell.  " });

    expect(result.ok).toBe(true);
    expect((fakeDb.peek(COLLECTIONS.listings, listingId) as { bio: string }).bio).toBe(
      "I help founders sell.",
    );
  });

  it("refuses a bio that runs long, without touching what is stored", async () => {
    const { listingId } = await listed();
    await saveProfile({ listingId, bio: "Kept." });

    const result = await saveProfile({ listingId, bio: "word ".repeat(40) });

    expect(result.ok).toBe(false);
    expect((fakeDb.peek(COLLECTIONS.listings, listingId) as { bio: string }).bio).toBe("Kept.");
  });

  it("re-encodes an upload to a square JPEG rather than storing what arrived", async () => {
    const { listingId } = await listed();
    const result = await saveProfile({ listingId, bio: "", photo: await portrait() });
    expect(result.ok).toBe(true);

    const stored = await getListingPhoto(listingId);
    expect(stored?.contentType).toBe("image/jpeg");

    // A 900x1200 portrait comes back square, which is what every avatar slot expects.
    const meta = await sharp(stored!.buffer).metadata();
    expect(meta.width).toBe(320);
    expect(meta.height).toBe(320);
  });

  it("marks the listing so the board knows a photo exists without reading it", async () => {
    const { listingId } = await listed();
    await saveProfile({ listingId, bio: "", photo: await portrait() });

    const doc = fakeDb.peek(COLLECTIONS.listings, listingId) as { photoUpdatedAt?: unknown };
    expect(doc.photoUpdatedAt).toBeTruthy();
  });

  it("rejects a file that is not an image", async () => {
    const { listingId } = await listed();
    const junk = new TextEncoder().encode("this is not a photo").buffer as ArrayBuffer;

    const result = await saveProfile({ listingId, bio: "", photo: junk });

    expect(result.ok).toBe(false);
    expect(await getListingPhoto(listingId)).toBeNull();
  });
});
