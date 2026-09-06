export const EDITORIAL_TOPICS = [
  { slug: "performance", label: "Performance", description: "The preparation, practice and decisions behind exceptional work." },
  { slug: "business", label: "Business", description: "Build something valuable. Make it clear who it is for." },
  { slug: "creativity", label: "Creativity", description: "Inside the craft: original ideas, considered experiments and better work." },
  { slug: "growth", label: "Growth", description: "Learning, focus and the small changes that move us forward." },
  { slug: "coaching", label: "Coaching", description: "The conversations and people that help others become better." },
] as const;

export type EditorialTopic = (typeof EDITORIAL_TOPICS)[number]["slug"];
export type EditorialFields = {
  topic?: EditorialTopic;
  authorName?: string;
  authorBio?: string;
  authorUrl?: string;
  coverUrl?: string;
  coverAlt?: string;
  coverCredit?: string;
  keyAnswer?: string;
  faqs?: { question: string; answer: string }[];
  sources?: { title: string; url: string }[];
  tags?: string[];
  featured?: boolean;
  noindex?: boolean;
};

export function isEditorialTopic(value: unknown): value is EditorialTopic {
  return EDITORIAL_TOPICS.some((topic) => topic.slug === value);
}

/** Preserve old article categories and bookmarks as the editorial expands. */
export function normalizeEditorialTopic(value: unknown): EditorialTopic | undefined {
  if (value === "productivity") return "growth";
  if (value === "branding") return "business";
  return isEditorialTopic(value) ? value : undefined;
}

export function editorialDefaults(fields: EditorialFields): Required<EditorialFields> {
  return {
    topic: normalizeEditorialTopic(fields.topic) || "coaching",
    authorName: fields.authorName || "CoachRank Editorial",
    authorBio: fields.authorBio || "An independent editorial for ambitious people. Celebrating greatness and understanding what builds it.",
    authorUrl: fields.authorUrl || "",
    coverUrl: fields.coverUrl || "",
    coverAlt: fields.coverAlt || "",
    coverCredit: fields.coverCredit || "",
    keyAnswer: fields.keyAnswer || "",
    faqs: fields.faqs || [],
    sources: fields.sources || [],
    tags: fields.tags || [],
    featured: fields.featured ?? false,
    noindex: fields.noindex ?? false,
  };
}

export function topicLabel(topic: EditorialTopic): string {
  return EDITORIAL_TOPICS.find((item) => item.slug === topic)!.label;
}

export function coverFor(post: EditorialFields & { slug?: string }): string {
  return post.coverUrl || (post.topic === "growth" || post.topic === "coaching" || /cost|questions/.test(post.slug || "") ? "/editorial/focus.webp" : "/editorial/growth.webp");
}

export function safeEditorialUrl(value: string, allowLocal = false): boolean {
  if (allowLocal && /^\/(?!\/)[^\s\\]*$/.test(value)) return true;
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}

export function jsonLd(value: object): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
