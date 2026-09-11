"use client";

import { useState } from "react";
import { AdminForm } from "./AdminForm";
import { articleChecks, articleDescription } from "@/lib/article-seo";
import { EDITORIAL_TOPICS } from "@/lib/editorial";
import { CATEGORIES } from "@/lib/categories";
import type { ActionResult } from "@/lib/domain/admin-actions";
import { slugifyTitle, readingMinutes } from "@/lib/markdown";
import type { BlogPost } from "@/lib/domain/types";

type Props = {
  post: BlogPost | null;
  saveAction: (formData: FormData) => Promise<ActionResult>;
  deleteAction?: (formData: FormData) => Promise<ActionResult>;
};

export function PostEditor({ post, saveAction, deleteAction }: Props) {
  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [body, setBody] = useState(post?.markdownBody ?? "");
  const [authorName, setAuthorName] = useState(post?.authorName || "CoachRank Editorial");
  const [authorUrl, setAuthorUrl] = useState(post?.authorUrl || "/about");
  const [noindex, setNoindex] = useState(post?.noindex || false);
  const [description, setDescription] = useState(post?.metaDescription ?? "");
  const [keyAnswer, setKeyAnswer] = useState(post?.keyAnswer ?? "");
  const [faqs, setFaqs] = useState(post?.faqs ?? []);
  const [sources, setSources] = useState(post?.sources ?? []);
  const [coverUrl, setCoverUrl] = useState(post?.coverUrl ?? "");
  const [coverAlt, setCoverAlt] = useState(post?.coverAlt ?? "");
  const [preview, setPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  const searchTitle = title.trim();
  const searchDescription = articleDescription({ metaDescription: description, excerpt });
  const checks = articleChecks({ title, excerpt, markdownBody: body, metaDescription: description, keyAnswer, sources, faqs, coverUrl, coverAlt, authorName, authorUrl });
  const reviewCount = checks.filter(check => !check.ok).length;

  async function togglePreview() {
    if (!preview) {
      const { renderMarkdown } = await import("@/lib/markdown");
      setPreviewHtml(renderMarkdown(body));
    }
    setPreview(value => !value);
  }

  return <div className="editor-workspace">
    <AdminForm action={saveAction} className="editor-form">
      {post ? <input type="hidden" name="id" value={post.id} /> : null}
      <input type="hidden" name="faqs" value={JSON.stringify(faqs)} />
      <input type="hidden" name="sources" value={JSON.stringify(sources)} />
      <div className="editor-columns">
        <div className="editor-main">
          <section className="editor-panel"><p className="journal-label">01 / The story</p>
            <label htmlFor="post-title">Article title <span>One title for the headline, Google, social previews and structured data.</span></label>
            <input id="post-title" name="title" className="field editor-title" value={title} onChange={event => {setTitle(event.target.value); if (!post) setSlug(slugifyTitle(event.target.value));}} required maxLength={140} placeholder="Brand Clarity Before Brand Identity: A Practical Guide" />
            <label htmlFor="post-excerpt">Standfirst <span>The short introduction readers see before opening the story.</span></label>
            <textarea id="post-excerpt" name="excerpt" className="field" rows={3} value={excerpt} onChange={event => setExcerpt(event.target.value)} maxLength={320} />
            <div className="editor-pair"><div><label htmlFor="post-topic">Topic</label><select id="post-topic" name="topic" className="field" defaultValue={post?.topic || "coaching"}>{EDITORIAL_TOPICS.map(topic => <option key={topic.slug} value={topic.slug}>{topic.label}</option>)}</select></div>
              <div><label htmlFor="post-tags">Tags <span>Separate with commas.</span></label><input id="post-tags" name="tags" className="field" defaultValue={post?.tags.join(", ") || ""} placeholder="Pricing, positioning, independent business" /></div></div>
            <div className="mt-5 flex items-center justify-between gap-4"><label htmlFor="post-body" className="!mt-0">Article · Markdown</label><button type="button" onClick={togglePreview} className="buy">{preview ? "Back to writing" : "Preview article ↗"}</button></div>
            <textarea id="post-body" name="markdownBody" rows={22} className={`field editor-body ${preview ? "hidden" : ""}`} value={body} onChange={event => setBody(event.target.value)} required={!preview} placeholder="Start with the idea. Use ## for section headings, > for a pull quote, and [source](https://...) for links." />
            {preview ? <div className="editor-preview"><h2>{title || "Your headline"}</h2><p className="journal-dek">{excerpt}</p>{keyAnswer ? <aside className="article-answer"><strong>The short answer</strong><p>{keyAnswer}</p></aside> : null}<div className="prose-doc" dangerouslySetInnerHTML={{__html:previewHtml}} /></div> : null}
            <p className="editor-hint">{words.toLocaleString()} words · {readingMinutes(body)} min read. Use examples, sources and a clear point of view; there is no target word count.</p>
          </section>

          <section className="editor-panel"><p className="journal-label">02 / Art direction</p>
            <label htmlFor="post-cover">Cover image URL <span>HTTPS image or a local path. Leave blank for CoachRank artwork.</span></label>
            <input id="post-cover" name="coverUrl" className="field" value={coverUrl} onChange={event => setCoverUrl(event.target.value)} placeholder="https://…" />
            <div className="editor-pair"><div><label htmlFor="post-alt">Image description</label><input id="post-alt" name="coverAlt" className="field" value={coverAlt} onChange={event => setCoverAlt(event.target.value)} required={Boolean(coverUrl)} /></div><div><label htmlFor="post-credit">Image credit</label><input id="post-credit" name="coverCredit" className="field" defaultValue={post?.coverCredit || ""} placeholder="Photographer / source" /></div></div>
          </section>

          <section className="editor-panel"><p className="journal-label">03 / Answers & evidence</p>
            <label htmlFor="post-answer">Key answer <span>An optional direct answer to the article’s central question. Shown to readers.</span></label>
            <textarea id="post-answer" name="keyAnswer" className="field" rows={4} value={keyAnswer} onChange={event => setKeyAnswer(event.target.value)} maxLength={700} />
            <div className="editor-subheading"><h3>Reader questions</h3><button type="button" className="buy" disabled={faqs.length >= 10} onClick={() => setFaqs([...faqs,{question:"",answer:""}])}>+ Add question</button></div>
            {faqs.map((faq,index) => <div className="editor-repeat" key={index}><label htmlFor={`faq-q-${index}`}>Question {index + 1}</label><input id={`faq-q-${index}`} className="field" value={faq.question} onChange={event => setFaqs(faqs.map((item,i) => i === index ? {...item,question:event.target.value} : item))} /><label htmlFor={`faq-a-${index}`}>Answer</label><textarea id={`faq-a-${index}`} className="field" rows={3} value={faq.answer} onChange={event => setFaqs(faqs.map((item,i) => i === index ? {...item,answer:event.target.value} : item))} /><button type="button" className="buy mt-3" onClick={() => setFaqs(faqs.filter((_,i) => i !== index))}>Remove question</button></div>)}
            <p className="editor-hint">Use questions that add something useful. FAQs do not guarantee search features or AI citations.</p>
            <div className="editor-subheading" id="post-sources"><h3>Sources & further reading</h3><button type="button" className="buy" disabled={sources.length >= 25} onClick={() => setSources([...sources,{title:"",url:""}])}>+ Add source</button></div>
            {sources.map((source,index) => <div className="editor-repeat" key={index}><label htmlFor={`source-title-${index}`}>Source {index + 1}</label><input id={`source-title-${index}`} className="field" value={source.title} placeholder="Publication or research title" onChange={event => setSources(sources.map((item,i) => i === index ? {...item,title:event.target.value} : item))} /><label htmlFor={`source-url-${index}`}>Source URL</label><input id={`source-url-${index}`} type="url" className="field" value={source.url} placeholder="https://…" onChange={event => setSources(sources.map((item,i) => i === index ? {...item,url:event.target.value} : item))} /><button type="button" className="buy mt-3" onClick={() => setSources(sources.filter((_,i) => i !== index))}>Remove source</button></div>)}
          </section>
        </div>
        <aside className="editor-sidebar">
          <section className="editor-panel"><p className="journal-label">Publish</p>
            <label className="editor-check"><input type="checkbox" name="featured" defaultChecked={post?.featured} />Feature on the homepage</label>
            <label className="editor-check"><input type="checkbox" name="noindex" checked={noindex} onChange={event => setNoindex(event.target.checked)} />Exclude from search indexing</label>
            <p className="editor-hint">Featuring selects placement only. It is independent of the paid rankings.</p>
            <div className="mt-5 flex flex-wrap gap-2"><button type="submit" name="status" value="draft" className="btn btn-quiet px-4 py-2.5">Save draft</button><button type="submit" name="status" value="published" className="btn btn-primary px-4 py-2.5">{post?.status === "published" ? "Update article" : "Publish article"}</button></div>
            {post?.status === "published" ? <p className="editor-hint">Saving as draft removes this article from the public site.</p> : null}
          </section>
          <section className="editor-panel"><p className="journal-label">Author</p>
            <label htmlFor="post-author">Byline</label><input id="post-author" name="authorName" className="field" value={authorName} onChange={event => setAuthorName(event.target.value)} />
            <label htmlFor="post-author-bio">Short bio</label><textarea id="post-author-bio" name="authorBio" className="field" rows={3} defaultValue={post?.authorBio || "Independent perspectives on coaching, business, productivity and branding."} />
            <label htmlFor="post-author-url">Author page <span>A profile or About page that identifies the author.</span></label><input id="post-author-url" name="authorUrl" className="field" value={authorUrl} onChange={event => setAuthorUrl(event.target.value)} />
          </section>
          <section className="editor-panel"><p className="journal-label">Search appearance</p>
            <label htmlFor="post-slug">URL slug</label><input id="post-slug" name="slug" className="field" value={slug} onChange={event => setSlug(event.target.value)} readOnly={Boolean(post?.publishedAtMs)} required />
            <p className="editor-hint">{post?.publishedAtMs ? "Published URLs stay fixed to preserve existing links." : "Use a concise, descriptive URL."}</p>
            <div className="editor-seo-sync"><span aria-hidden="true">✓</span><div><strong>One title, everywhere.</strong><p>Edit the article title above to update the headline, search title, share card and article schema together.</p></div></div>
            <label htmlFor="post-meta">Search description <span>{searchDescription.length} characters. Leave blank to use the standfirst. Summarize the value without repeating keywords.</span></label><textarea id="post-meta" name="metaDescription" className="field" rows={4} value={description} onChange={event => setDescription(event.target.value)} maxLength={200} />
            <p className="editor-preview-label">Google preview</p><div className="editor-search-preview"><span>coachrank.lol › blog › {slug || "your-story"}</span><strong>{searchTitle || "Your article title"}</strong><p>{searchDescription || "A useful, accurate description of what the reader will find."}</p></div>
            <p className="editor-hint">Illustrative preview. Google chooses the title and snippet for each search. Updates appear after it recrawls the page.</p><p className="editor-preview-label">X & link previews</p><div className="editor-social-preview"><div><span>CoachRank.</span><strong>{searchTitle || "Your article title"}</strong></div><section><strong>{searchTitle || "Your article title"}</strong><p>{searchDescription || "Your search description also introduces the article when shared."}</p><span>coachrank.lol</span></section></div><p className="editor-hint">The share image is generated from the same title. Platforms may retain an older preview until their cache refreshes.</p><p className={`editor-index-status ${noindex ? "needs-review" : ""}`}>{noindex ? "Excluded from indexing and the sitemap. Turn off the checkbox above when ready for discovery." : post?.status === "published" ? "Published and eligible for indexing. Included in the sitemap." : "Drafts stay private. Publishing adds this URL to the sitemap."}</p>
          </section>
          <section className="editor-panel"><p className="journal-label">Search & reader readiness</p>
            <h3 className="editor-check-summary">{reviewCount ? `${reviewCount} things to review` : "Editing checks complete"}</h3>
            <ul className="editor-checklist">{checks.map(check => <li key={check.id} className={check.ok ? "is-ready" : "needs-review"}><span aria-hidden="true">{check.ok ? "✓" : "○"}</span><div><a href={`#${check.field}`}>{check.label}</a><p>{check.detail}</p></div></li>)}</ul>
            <p className="editor-hint">These are editing prompts, not a ranking score or fact check. Put readers first, verify claims and avoid keyword stuffing. FAQs and structured data do not guarantee search features or AI citations.</p>
          </section>
          <details className="editor-panel"><summary className="text-[14px] font-semibold">Optional rankings link</summary><label htmlFor="post-cta">Relevant coach category</label><select id="post-cta" name="ctaCategory" className="field" defaultValue={post?.ctaCategory || ""}><option value="">No rankings link</option>{CATEGORIES.map(category => <option key={category.slug} value={category.slug}>{category.label}</option>)}</select><p className="editor-hint">For articles about hiring a coach. Shown as a clearly labeled paid directory link.</p></details>
        </aside>
      </div>
    </AdminForm>
    {post && deleteAction ? <AdminForm action={deleteAction} className="mt-6"><input type="hidden" name="id" value={post.id} /><button type="submit" className="text-[13px] text-flag">Delete this article</button></AdminForm> : null}
  </div>;
}
