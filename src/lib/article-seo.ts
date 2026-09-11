import type { EditorialFields } from "./editorial";

type ArticleDraft = EditorialFields & {
  title: string;
  excerpt: string;
  markdownBody: string;
  metaDescription?: string;
};

export function articleDescription(post: Pick<ArticleDraft, "metaDescription" | "excerpt">): string {
  return post.metaDescription?.trim() || post.excerpt.trim();
}

export function hasHouseStyleDash(value: string): boolean {
  return /\u2014|&mdash;|&#0*8212;|&#x0*2014;|\\u2014/i.test(value);
}

export type EditorialCheck = { id: string; label: string; detail: string; ok: boolean; field: string };

/** Editing guidance, never a promise of rankings or a keyword-density score. */
export function articleChecks(post: ArticleDraft): EditorialCheck[] {
  const description = articleDescription(post);
  const title = post.title.trim();
  const copy = [title, post.excerpt, description, post.markdownBody, post.keyAnswer || "", post.coverAlt || "", post.coverCredit || "", post.authorName || "", post.authorBio || "", ...(post.tags || []), ...(post.faqs || []).flatMap(faq => [faq.question, faq.answer]), ...(post.sources || []).map(source => source.title)].join("\n");
  return [
    { id: "headline", label: "A clear, focused headline", detail: `${title.length} characters. Name the subject and the reader's benefit. Around 30 to 65 characters is a useful editing guide, not a Google limit.`, ok: title.length >= 30 && title.length <= 65, field: "post-title" },
    { id: "description", label: "A useful search description", detail: `${description.length} characters. Summarize this article in a complete sentence. Around 120 to 170 characters usually leaves room for a useful preview.`, ok: description.length >= 120 && description.length <= 170, field: "post-meta" },
    { id: "standfirst", label: "An introduction visible to readers", detail: "Explain what the reader will learn before the article begins.", ok: Boolean(post.excerpt.trim()), field: "post-excerpt" },
    { id: "headings", label: "Descriptive section headings", detail: "Use ## headings to make the argument easy to scan and link to.", ok: /^##\s+\S/m.test(post.markdownBody), field: "post-body" },
    { id: "answer", label: "A direct answer to the main question", detail: "Answer plainly, then use the article to explain the evidence and practical steps.", ok: Boolean(post.keyAnswer?.trim()), field: "post-answer" },
    { id: "sources", label: "Evidence readers can check", detail: "Link to the original research or source for factual claims. Check that it supports the claim.", ok: Boolean(post.sources?.some(source => source.title.trim() && /^https:\/\//.test(source.url))), field: "post-sources" },
    { id: "image", label: "An accessible article cover", detail: "Describe the actual image. CoachRank's default artwork includes a description.", ok: !post.coverUrl || Boolean(post.coverAlt?.trim()), field: "post-alt" },
    { id: "author", label: "An identifiable author", detail: "Use a real byline and a profile or About page that explains who wrote the article.", ok: Boolean(post.authorName?.trim() && post.authorUrl?.trim()), field: "post-author" },
    { id: "style", label: "CoachRank house style", detail: "Use periods, commas, colons or parentheses. No em dashes, including encoded versions.", ok: !hasHouseStyleDash(copy), field: "post-body" },
  ];
}

/** Compare normalized titles/descriptions without confusing punctuation or case. */
export function duplicateArticleIds(posts: { id: string; title: string; excerpt: string; metaDescription?: string }[]): Set<string> {
  const duplicates = new Set<string>();
  for (const field of ["title", "description"] as const) {
    const seen = new Map<string, string>();
    for (const post of posts) {
      const value = (field === "title" ? post.title : articleDescription(post)).trim().toLowerCase().replace(/\s+/g, " ");
      if (!value) continue;
      const previous = seen.get(value);
      if (previous) { duplicates.add(previous); duplicates.add(post.id); }
      else seen.set(value, post.id);
    }
  }
  return duplicates;
}
