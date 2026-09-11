import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { articleChecks, articleDescription, duplicateArticleIds } from "@/lib/article-seo";

vi.mock("firebase-admin/firestore", async () => {
  const { FakeTimestamp } = await import("./fake-firestore");
  return { Timestamp: FakeTimestamp };
});
vi.mock("@/lib/firebase/admin", async () => {
  const { fakeDb } = await import("./fake-firestore");
  return { getDb: () => fakeDb, requireDb: () => fakeDb };
});
import { validateBlogInput, createPost, updatePost, getPostById } from "@/lib/domain/blog";
import BlogPage, { generateMetadata } from "@/app/blog/[slug]/page";
import { fakeDb } from "./fake-firestore";

beforeEach(() => fakeDb.reset());
const article = {
  title: "Brand Clarity Before Brand Identity: A Practical Guide",
  slug: "brand-clarity-before-brand-identity",
  excerpt: "Learn how to make your brand easier to understand.",
  markdownBody: "## Start with the audience\nAsk a real customer what they understood.",
  status: "published" as const,
};

describe("one article title across discovery channels", () => {
  it("ignores a stale or tampered SEO title on validation, creation and update", async () => {
    const parsed = validateBlogInput({ ...article, seoTitle: "Different search title" });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error("Invalid fixture");
    expect(parsed.value.seoTitle).toBe(article.title);
    const id = await createPost({ ...article, seoTitle: "Different search title" });
    expect((await getPostById(id))?.seoTitle).toBe(article.title);
    await updatePost(id, { ...article, title: "A Revised Brand Clarity Guide", seoTitle: "Stale value" });
    const stored = await fakeDb.collection("blogPosts").doc(id).get();
    expect(stored.data()?.seoTitle).toBe("A Revised Brand Clarity Guide");
  });

  it("renders the identical headline in HTML, metadata, social tags and article schema", async () => {
    await createPost({ ...article, seoTitle: "Old and different", authorName: "CoachRank Editorial", authorUrl: "/about" });
    const props = { params: Promise.resolve({ slug: article.slug }), searchParams: Promise.resolve({}) };
    const metadata = await generateMetadata(props);
    expect(metadata.title).toEqual({ absolute: article.title });
    expect(metadata.openGraph?.title).toBe(article.title);
    expect(metadata.twitter?.title).toBe(article.title);
    expect(metadata.description).toBe(article.excerpt);
    expect(metadata.alternates?.canonical).toBe(`/blog/${article.slug}`);
    const html = renderToStaticMarkup(await BlogPage(props));
    expect(html).toContain(`<h1>${article.title}</h1>`);
    expect(html.match(/<h1>/g)).toHaveLength(1);
    const schema = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1]);
    expect(schema["@graph"][0].headline).toBe(article.title);
    expect(schema["@graph"][0].author.url).toContain("/about");
    expect(schema["@graph"].at(-1).itemListElement.map((item: { name: string }) => item.name)).toEqual(["CoachRank", "Coaching", article.title]);
  });

  it("keeps drafts out of article metadata and honors explicit noindex", async () => {
    const id = await createPost({ ...article, status: "draft" });
    const props = { params: Promise.resolve({ slug: article.slug }), searchParams: Promise.resolve({}) };
    expect((await generateMetadata(props)).robots).toEqual({ index: false, follow: false });
    await updatePost(id, { ...article, noindex: true });
    expect((await generateMetadata(props)).robots).toMatchObject({ index: false, follow: true });
  });
});

describe("editorial guidance and publishing guardrails", () => {
  it("uses the visible introduction when a description is blank and never silently truncates it", () => {
    expect(articleDescription({ excerpt: "A useful fallback.", metaDescription: "  " })).toBe("A useful fallback.");
    const parsed = validateBlogInput({ ...article, metaDescription: " " });
    expect(parsed.ok && parsed.value.metaDescription).toBe(article.excerpt);
    expect(validateBlogInput({ ...article, metaDescription: "x".repeat(201) }).ok).toBe(false);
    expect(validateBlogInput({ ...article, excerpt: "" }).ok).toBe(false);
  });
  it("rejects encoded house-style violations and reviews every important reader field", () => {
    for (const value of ["\u2014", "&mdash;", "&#8212;", "&#x2014;", "\\u2014"]) {
      expect(validateBlogInput({ ...article, keyAnswer: `One${value}two` }).ok).toBe(false);
    }
    expect(articleChecks({ ...article, keyAnswer: "Answer", authorName: "Editor", authorUrl: "/about", sources: [{ title: "Research", url: "https://example.com" }] }).find(check => check.id === "author")?.ok).toBe(true);
  });
  it("flags duplicate titles or descriptions after whitespace and case normalization", () => {
    const posts = [{ id: "a", title: "Brand Clarity", excerpt: "First" }, { id: "b", title: " Brand   clarity ", excerpt: "Second" }, { id: "c", title: "Unique", excerpt: "FIRST" }, { id: "d", title: "Different", excerpt: "Distinct" }];
    expect([...duplicateArticleIds(posts)].sort()).toEqual(["a", "b", "c"]);
  });
  it("keeps all reviewed article sources aligned and ready to import", () => {
    const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
    const entries = [...read("content/editorial-launch/manifest.json"), ...read("content/editorial-edition-02/manifest.json"), ...read("content/blog/editorial-metadata.json")];
    expect(entries).toHaveLength(35);
    expect(new Set(entries.map(entry => entry.title)).size).toBe(entries.length);
    expect(new Set(entries.map(entry => entry.metaDescription)).size).toBe(entries.length);
    for (const entry of entries) {
      expect(entry.seoTitle || entry.title).toBe(entry.title);
      expect(entry.metaDescription.length).toBeLessThanOrEqual(200);
      expect(entry.metaDescription).toMatch(/[.!?]$/);
    }
    for (const file of readdirSync("content/blog").filter(name => name.endsWith(".md"))) {
      const raw = readFileSync(`content/blog/${file}`, "utf8");
      expect(raw.match(/^seoTitle: (.+)$/m)?.[1]).toBe(raw.match(/^title: (.+)$/m)?.[1]);
    }
  });
});
