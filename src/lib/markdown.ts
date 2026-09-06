import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

marked.setOptions({ gfm: true, breaks: false });

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "h2", "h3", "h4", "p", "ul", "ol", "li", "blockquote", "pre", "code",
    "strong", "em", "a", "hr", "br", "table", "thead", "tbody", "tr", "th", "td", "img",
  ],
  allowedAttributes: {
    a: ["href", "title", "rel", "target"],
    th: ["align"],
    td: ["align"],
    img: ["src", "alt", "title", "width", "height", "loading"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: {
    // Demote h1 - the page already owns the single top-level heading.
    h1: "h2",
    img: (tagName, attribs) => ({ tagName, attribs: { ...attribs, loading: "lazy" } }),
    a: (tagName, attribs) => {
      const href = attribs.href ?? "";
      const external = /^https?:\/\//i.test(href) && !href.includes("coachrank.lol");
      return {
        tagName,
        attribs: external
          ? { ...attribs, rel: "nofollow noopener noreferrer", target: "_blank" }
          : attribs,
      };
    },
  },
};

/** Markdown from the admin CMS, rendered to HTML on the server and sanitized to an allowlist. */
export function renderMarkdown(markdown: string): string {
  const html = marked.parse(markdown ?? "", { async: false });
  return sanitizeHtml(html, SANITIZE_OPTIONS);
}

/** Stable, deduplicated section anchors built from sanitized article HTML. */
export function renderArticle(markdown: string) {
  const headings: { id: string; text: string }[] = [];
  const counts = new Map<string, number>();
  const html = renderMarkdown(markdown).replace(/<h2>([\s\S]*?)<\/h2>/g, (_match, content: string) => {
    const text = sanitizeHtml(content, { allowedTags: [], allowedAttributes: {} });
    const base = slugifyTitle(text) || "section";
    const count = (counts.get(base) || 0) + 1;
    counts.set(base, count);
    const id = `section-${base}${count > 1 ? `-${count}` : ""}`;
    headings.push({ id, text });
    return `<h2 id="${id}">${content}</h2>`;
  });
  return { html, headings };
}

/** ~200 words per minute, rounded up, minimum 1. */
export function readingMinutes(markdown: string): number {
  const words = (markdown ?? "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function slugifyTitle(title: string): string {
  return title
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}
