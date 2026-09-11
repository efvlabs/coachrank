"use client";
/* Editor-managed cover URLs are validated by the publishing form. */
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useMemo, useState } from "react";
import { EDITORIAL_TOPICS, coverFor, topicLabel } from "@/lib/editorial";
import { articleChecks, articleDescription, duplicateArticleIds } from "@/lib/article-seo";
import type { BlogPost } from "@/lib/domain/types";

export function EditorialLibrary({ posts }: { posts: BlogPost[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [topic, setTopic] = useState("all");
  const [readiness, setReadiness] = useState("all");
  const duplicates = useMemo(() => duplicateArticleIds(posts.filter(post => post.status === "published")), [posts]);
  const reviewed = useMemo(() => posts.map(post => ({ post, issues: articleChecks(post).filter(check => !check.ok) })), [posts]);
  const needsReview = reviewed.filter(({ post, issues }) => issues.length || duplicates.has(post.id)).length;
  const filtered = reviewed.filter(({ post, issues }) =>
    (status === "all" || post.status === status) &&
    (topic === "all" || post.topic === topic) &&
    (readiness === "all" || (readiness === "review" ? issues.length || duplicates.has(post.id) : post.noindex)) &&
    `${post.title} ${post.tags.join(" ")} ${post.slug}`.toLowerCase().includes(query.toLowerCase())
  );
  return <>
    <section className="editor-library-guidance">
      <div><p className="journal-label">Search & reader readiness</p><h2>One story. One title. Every channel.</h2><p>Your article title also powers Google metadata, social previews and article schema. Keep it specific, useful and faithful to the story.</p></div>
      <div><strong>{needsReview}</strong><span>articles with editing prompts</span><button type="button" className="buy" onClick={() => setReadiness("review")}>Review articles ↗</button></div>
    </section>
    <div className="admin-library-filters">
      <label><span className="sr-only">Search articles</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search stories, topics or tags…" type="search" /></label>
      <label><span className="sr-only">Publication status</span><select value={status} onChange={event => setStatus(event.target.value)}><option value="all">Every status</option><option value="published">Published</option><option value="draft">Drafts</option></select></label>
      <label><span className="sr-only">Editorial topic</span><select value={topic} onChange={event => setTopic(event.target.value)}><option value="all">Every topic</option>{EDITORIAL_TOPICS.map(item => <option key={item.slug} value={item.slug}>{item.label}</option>)}</select></label>
      <label><span className="sr-only">Search readiness</span><select value={readiness} onChange={event => setReadiness(event.target.value)}><option value="all">Every readiness</option><option value="review">Editing prompts</option><option value="noindex">Excluded from search</option></select></label>
    </div>
    <p className="admin-result-count">{filtered.length} {filtered.length === 1 ? "story" : "stories"}. Editing checks are guidance, not a ranking score.</p>
    <div className="admin-story-list">{filtered.map(({ post, issues }) => <article key={post.id} className="admin-story">
      <Link href={`/admin/blog/${post.id}`} className="admin-story-art"><img src={coverFor(post)} alt="" width={180} height={130} /></Link>
      <div className="admin-story-copy">
        <p>{topicLabel(post.topic)}{post.featured ? " · Featured" : ""}</p><Link href={`/admin/blog/${post.id}`}><h2>{post.title}</h2></Link>
        <span>{articleDescription(post)}</span>
        <div className="admin-story-meta"><span>{post.authorName}</span><span>Updated {new Date(post.updatedAtMs).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}</span><span>{post.sources.length} sources</span></div>
        <div className="admin-story-seo"><span>{post.noindex ? "Excluded from search" : post.status === "published" ? "In sitemap" : "Private draft"}</span><span>{post.title.length} title characters</span><span>{articleDescription(post).length} description characters</span></div>
        {duplicates.has(post.id) ? <p className="editor-review-note">A published article shares this title or description. Make each page distinct.</p> : null}
        {issues.length ? <p className="editor-review-note">Review: {issues.map(check => check.label.toLowerCase()).join("; ")}.</p> : null}
      </div>
      <div className="admin-story-actions"><span className={`admin-badge ${post.status === "published" ? "is-published" : ""}`}>{post.status}</span><Link href={`/admin/blog/${post.id}`} className="tool-text-link">Edit story ↗</Link>{post.status === "published" ? <Link href={`/blog/${post.slug}`} className="admin-public-link">View published</Link> : null}</div>
    </article>)}</div>
    {!filtered.length ? <div className="admin-empty"><h2>No stories in this view.</h2><p>Try another filter, or begin a new article.</p><Link href="/admin/blog/new" className="tool-text-link">Write something useful ↗</Link></div> : null}
  </>;
}
