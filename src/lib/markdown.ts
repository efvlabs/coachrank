import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

marked.setOptions({ gfm: true, breaks: false });

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "h2", "h3", "h4", "p", "ul", "ol", "li", "blockquote", "pre", "code",
    "strong", "em", "a", "hr", "br", "table", "thead", "tbody", "tr", "th", "td",
  ],
  allowedAttributes: {
    a: ["href", "title", "rel", "target"],
    th: ["align"],
    td: ["align"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: {
    // Demote h1 - the page already owns the single top-level heading.
    h1: "h2",
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
