import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("firebase-admin/firestore", async () => {
  const { FakeFieldValue, FakeTimestamp } = await import("./fake-firestore");
  return { FieldValue: FakeFieldValue, Timestamp: FakeTimestamp };
});
vi.mock("@/lib/firebase/admin", async () => {
  const { fakeDb } = await import("./fake-firestore");
  return { getDb: () => fakeDb, requireDb: () => fakeDb, isFirebaseConfigured: () => true };
});

import { createPost, updatePost, getPostById, getPublishedPostBySlug, validateBlogInput } from "@/lib/domain/blog";
import { jsonLd, safeEditorialUrl } from "@/lib/editorial";
import { renderArticle } from "@/lib/markdown";
import { POST as spotlightCheckout } from "@/app/api/spotlight/checkout/route";
import { fakeDb, FakeTimestamp } from "./fake-firestore";

beforeEach(() => fakeDb.reset());

const draft = {
  title: "Pricing a coaching offer",
  slug: "pricing-a-coaching-offer",
  excerpt: "A practical guide to capacity and price.",
  markdownBody: "## Count the time\nInclude preparation and delivery.",
  status: "draft" as const,
};

describe("editorial publishing", () => {
  it("keeps drafts private and preserves editorial fields when published", async () => {
    const parsed = validateBlogInput({ ...draft, topic: "business", coverUrl: "https://example.com/cover.jpg", coverAlt: "A planning worksheet", keyAnswer: "Count delivery and preparation time.", faqs: [{ question: "What counts?", answer: "All delivery work." }], sources: [{ title: "Source", url: "https://example.com/research" }], featured: true, noindex: true });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error("Invalid fixture");
    const id = await createPost(parsed.value);
    expect(await getPublishedPostBySlug(draft.slug)).toBeNull();
    await updatePost(id, { ...parsed.value, status: "published" });
    const post = await getPublishedPostBySlug(draft.slug);
    expect(post).toMatchObject({ topic: "business", featured: true, noindex: true, coverAlt: "A planning worksheet", keyAnswer: "Count delivery and preparation time.", faqs: parsed.value.faqs, sources: parsed.value.sources });
  });

  it("preserves the original publication date across unpublishing and rejects changing the established URL", async () => {
    const id = await createPost({ ...draft, status: "published" });
    const original = (await getPostById(id))!;
    await updatePost(id, draft);
    expect(await getPublishedPostBySlug(draft.slug)).toBeNull();
    expect((await getPostById(id))!.publishedAtMs).toBe(original.publishedAtMs);
    await expect(updatePost(id, { ...draft, slug: "changed-url" })).rejects.toThrow("Keep the published URL");
    await updatePost(id, { ...draft, status: "published" });
    expect((await getPostById(id))!.publishedAtMs).toBe(original.publishedAtMs);
  });

  it("reads legacy articles with usable editorial defaults", async () => {
    const ref = await fakeDb.collection("blogPosts").add({ ...draft, publishedAt: null, createdAt: FakeTimestamp.now(), updatedAt: FakeTimestamp.now() });
    const post = (await getPostById(ref.id))!;
    expect(post.authorName).toBe("CoachRank Editorial");
    expect(post.faqs).toEqual([]);
    expect(post.topic).toBe("coaching");
  });

  it("rejects incomplete sources, unsafe image URLs and missing descriptions", () => {
    expect(validateBlogInput({ ...draft, coverUrl: "javascript:alert(1)" }).ok).toBe(false);
    expect(validateBlogInput({ ...draft, coverUrl: "https://example.com/a.jpg" }).ok).toBe(false);
    expect(validateBlogInput({ ...draft, sources: [{title:"Source",url:"javascript:alert(1)"}] }).ok).toBe(false);
    expect(validateBlogInput({ ...draft, faqs: [{question:"Question",answer:""}] }).ok).toBe(false);
    expect(safeEditorialUrl("//evil.example", true)).toBe(false);
  });
});

describe("article output", () => {
  it("creates unique navigable section IDs while removing scripts and unsafe attributes", () => {
    const article = renderArticle('## A question\n<script>alert(1)</script>\n\n## A question\n<img src="https://example.com/a.jpg" alt="Example" onerror="alert(1)">');
    expect(article.headings.map(heading => heading.id)).toEqual(["section-a-question", "section-a-question-2"]);
    expect(article.html).toContain('id="section-a-question-2"');
    expect(article.html).not.toContain("<script>");
    expect(article.html).not.toContain("onerror");
    expect(article.html).toContain('alt="Example"');
  });

  it("prevents article text from closing the JSON-LD script tag", () => {
    const encoded = jsonLd({ headline: "</script><script>alert(1)</script>" });
    expect(encoded).not.toContain("<");
    expect(JSON.parse(encoded).headline).toBe("</script><script>alert(1)</script>");
  });

  it("rejects new Spotlight checkout while paused", async () => {
    const response = await spotlightCheckout(new Request("https://coachrank.lol/api/spotlight/checkout", { method: "POST" }));
    expect(response.status).toBe(503);
    expect(await response.text()).toContain("Spotlight bookings are paused");
  });
});
