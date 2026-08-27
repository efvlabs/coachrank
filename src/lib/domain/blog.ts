import "server-only";

import { Timestamp } from "firebase-admin/firestore";

import { isCategorySlug } from "../categories";
import { getDb, requireDb } from "../firebase/admin";
import { slugifyTitle } from "../markdown";
import { COLLECTIONS, toBlogPost } from "./collections";
import type { BlogPost, BlogPostDoc, BlogStatus } from "./types";

function postsRef() {
  return getDb()?.collection(COLLECTIONS.blogPosts) ?? null;
}

export async function getPublishedPosts(limit = 50): Promise<BlogPost[]> {
  const ref = postsRef();
  if (!ref) return [];
  try {
    const snap = await ref
      .where("status", "==", "published")
      .orderBy("publishedAt", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((d) => toBlogPost(d.id, d.data() as BlogPostDoc));
  } catch (error) {
    console.error("[blog] getPublishedPosts failed:", error);
    return [];
  }
}

export async function getPublishedPostBySlug(slug: string): Promise<BlogPost | null> {
  const ref = postsRef();
  if (!ref || !slug) return null;
  try {
    const snap = await ref.where("slug", "==", slug).where("status", "==", "published").limit(1).get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return toBlogPost(doc.id, doc.data() as BlogPostDoc);
  } catch (error) {
    console.error("[blog] getPublishedPostBySlug failed:", error);
    return null;
  }
}

/** Admin-only: every post, published or not. */
export async function listAllPosts(limit = 200): Promise<BlogPost[]> {
  const ref = postsRef();
  if (!ref) return [];
  try {
    const snap = await ref.orderBy("updatedAt", "desc").limit(limit).get();
    return snap.docs.map((d) => toBlogPost(d.id, d.data() as BlogPostDoc));
  } catch (error) {
    console.error("[blog] listAllPosts failed:", error);
    return [];
  }
}

export async function getPostById(id: string): Promise<BlogPost | null> {
  const ref = postsRef();
  if (!ref || !id) return null;
  const snap = await ref.doc(id).get();
  if (!snap.exists) return null;
  return toBlogPost(snap.id, snap.data() as BlogPostDoc);
}

export type BlogInput = {
  title: string;
  slug?: string;
  excerpt: string;
  markdownBody: string;
  seoTitle?: string;
  metaDescription?: string;
  ctaCategory?: string | null;
  status: BlogStatus;
};

export type BlogValidationError = { field: string; message: string };

export function validateBlogInput(
  input: Partial<BlogInput>,
): { ok: true; value: BlogInput } | { ok: false; errors: BlogValidationError[] } {
  const errors: BlogValidationError[] = [];
  const title = (input.title ?? "").trim();
  const markdownBody = (input.markdownBody ?? "").trim();
  const excerpt = (input.excerpt ?? "").trim();
  const slug = ((input.slug ?? "").trim() || slugifyTitle(title)).slice(0, 90);
  const status: BlogStatus = input.status === "published" ? "published" : "draft";

  if (!title) errors.push({ field: "title", message: "Title is required." });
  if (title.length > 140) errors.push({ field: "title", message: "Title is too long." });
  if (!markdownBody) errors.push({ field: "markdownBody", message: "Body is required." });
  if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    errors.push({ field: "slug", message: "Slug must be lowercase letters, numbers and hyphens." });
  }
  if (excerpt.length > 320) errors.push({ field: "excerpt", message: "Excerpt is too long." });
  const metaDescription = (input.metaDescription ?? excerpt).trim().slice(0, 200);

  if (errors.length) return { ok: false, errors };

  return {
    ok: true,
    value: {
      title,
      slug,
      excerpt,
      markdownBody,
      seoTitle: (input.seoTitle ?? "").trim() || title,
      metaDescription,
      ctaCategory: isCategorySlug(input.ctaCategory) ? input.ctaCategory : null,
      status,
    },
  };
}

async function slugTakenBy(slug: string): Promise<string | null> {
  const ref = postsRef();
  if (!ref) return null;
  const snap = await ref.where("slug", "==", slug).limit(1).get();
  return snap.empty ? null : snap.docs[0].id;
}

export async function createPost(input: BlogInput): Promise<string> {
  const db = requireDb();
  const taken = await slugTakenBy(input.slug!);
  if (taken) throw new Error("That slug is already used by another post.");

  const now = Timestamp.now();
  const doc: BlogPostDoc = {
    title: input.title,
    slug: input.slug!,
    excerpt: input.excerpt,
    markdownBody: input.markdownBody,
    seoTitle: input.seoTitle ?? input.title,
    metaDescription: input.metaDescription ?? input.excerpt,
    ctaCategory: isCategorySlug(input.ctaCategory) ? input.ctaCategory : null,
    status: input.status,
    publishedAt: input.status === "published" ? now : null,
    updatedAt: now,
    createdAt: now,
  };
  const ref = await db.collection(COLLECTIONS.blogPosts).add(doc);
  return ref.id;
}

export async function updatePost(id: string, input: BlogInput): Promise<void> {
  const db = requireDb();
  const existing = await getPostById(id);
  if (!existing) throw new Error("Post not found.");

  const taken = await slugTakenBy(input.slug!);
  if (taken && taken !== id) throw new Error("That slug is already used by another post.");

  const now = Timestamp.now();
  const publishing = input.status === "published";
  const patch: Partial<BlogPostDoc> = {
    title: input.title,
    slug: input.slug!,
    excerpt: input.excerpt,
    markdownBody: input.markdownBody,
    seoTitle: input.seoTitle ?? input.title,
    metaDescription: input.metaDescription ?? input.excerpt,
    ctaCategory: isCategorySlug(input.ctaCategory) ? input.ctaCategory : null,
    status: input.status,
    updatedAt: now,
    // Keep the original publication date across edits; clear it when unpublishing.
    publishedAt: publishing
      ? (existing.publishedAtMs ? Timestamp.fromMillis(existing.publishedAtMs) : now)
      : null,
  };
  await db.collection(COLLECTIONS.blogPosts).doc(id).update(patch);
}

export async function deletePost(id: string): Promise<void> {
  await requireDb().collection(COLLECTIONS.blogPosts).doc(id).delete();
}
