/* Cover URLs may point to editor-managed HTTPS hosts; bundled artwork is precompressed. */
/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { articleDescription } from "@/lib/article-seo";
import { SITE, absoluteUrl } from "@/lib/config";
import { getCategory } from "@/lib/categories";
import { coverFor, jsonLd, topicLabel } from "@/lib/editorial";
import { getPublishedPostBySlug, getPublishedPosts } from "@/lib/domain/blog";
import { readingMinutes, renderArticle } from "@/lib/markdown";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);
  if (!post) return { title: "Article not found", robots: { index: false, follow: false } };
  return {
    title: { absolute: post.title },
    description: articleDescription(post),
    authors: [{ name: post.authorName, ...(post.authorUrl ? { url: post.authorUrl } : {}) }],
    publisher: SITE.name,
    keywords: post.tags,
    alternates: { canonical: `/blog/${post.slug}` },
    robots: { index: !post.noindex, follow: true, "max-image-preview": "large" },
    openGraph: {
      type: "article", title: post.title,
      description: articleDescription(post),
      url: absoluteUrl(`/blog/${post.slug}`),
      publishedTime: post.publishedAtMs ? new Date(post.publishedAtMs).toISOString() : undefined,
      modifiedTime: new Date(post.updatedAtMs).toISOString(),
      authors: [post.authorName], section: topicLabel(post.topic), tags: post.tags, siteName: SITE.name,
    },
    twitter: { card: "summary_large_image", site: SITE.twitter, title: post.title, description: articleDescription(post) },
  };
}

function formatDate(ms: number | null): string {
  return ms ? new Date(ms).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }) : "";
}

export default async function BlogPostPage({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);
  if (!post) notFound();
  const related = (await getPublishedPosts(100)).filter(item => item.id !== post.id).sort((a,b) => Number(b.topic === post.topic) - Number(a.topic === post.topic)).slice(0,3);
  const { html, headings } = renderArticle(post.markdownBody);
  const cover = coverFor(post);
  const cta = post.ctaCategory ? getCategory(post.ctaCategory) : null;
  const author = { "@type": post.authorName === "CoachRank Editorial" ? "Organization" : "Person", name: post.authorName, description: post.authorBio, ...(post.authorUrl ? {url:post.authorUrl.startsWith("/") ? absoluteUrl(post.authorUrl) : post.authorUrl} : {}) };
  const structured = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type":"BlogPosting", "@id":absoluteUrl(`/blog/${post.slug}#article`), headline:post.title,
        description:articleDescription(post), image:cover.startsWith("/") ? absoluteUrl(cover) : cover,
        datePublished:post.publishedAtMs ? new Date(post.publishedAtMs).toISOString() : undefined,
        dateModified:new Date(post.updatedAtMs).toISOString(), author,
        publisher:{"@type":"Organization",name:SITE.name,url:SITE.url,logo:{"@type":"ImageObject",url:absoluteUrl("/brand/avatar-512.png")}},
        mainEntityOfPage:absoluteUrl(`/blog/${post.slug}`), inLanguage:"en", articleSection:topicLabel(post.topic), keywords:post.tags,
        ...(post.keyAnswer ? {abstract:post.keyAnswer} : {}),
        ...(post.sources.length ? {citation:post.sources.map(source => source.url)} : {}),
      },
      ...(post.faqs.length ? [{ "@type":"FAQPage", "@id":absoluteUrl(`/blog/${post.slug}#questions`), mainEntity:post.faqs.map(faq=>({"@type":"Question",name:faq.question,acceptedAnswer:{"@type":"Answer",text:faq.answer}})) }] : []),
      { "@type":"BreadcrumbList", itemListElement:[
        {"@type":"ListItem",position:1,name:"CoachRank",item:SITE.url},
        {"@type":"ListItem",position:2,name:topicLabel(post.topic),item:absoluteUrl(`/topics/${post.topic}`)},
        {"@type":"ListItem",position:3,name:post.title,item:absoluteUrl(`/blog/${post.slug}`)},
      ]},
    ],
  };

  return <div className="journal-shell article-shell">
    <nav aria-label="Breadcrumb" className="article-breadcrumb"><Link href="/">Editorial</Link><span>/</span><Link href={`/topics/${post.topic}`}>{topicLabel(post.topic)}</Link></nav>
    <article>
      <header className="article-header"><p className="journal-label">{topicLabel(post.topic)} <span> / </span> {readingMinutes(post.markdownBody)} min read</p><h1>{post.title}</h1>{post.excerpt ? <p className="article-standfirst">{post.excerpt}</p> : null}
        <div className="article-byline"><span>By {post.authorUrl ? <a href={post.authorUrl}>{post.authorName}</a> : <strong>{post.authorName}</strong>}</span>{post.publishedAtMs ? <time dateTime={new Date(post.publishedAtMs).toISOString()}>{formatDate(post.publishedAtMs)}</time> : null}
          {post.publishedAtMs && post.updatedAtMs - post.publishedAtMs > 86400000 ? <span>Updated {formatDate(post.updatedAtMs)}</span> : null}</div>
      </header>
      <figure className="article-cover"><img src={cover} alt={post.coverAlt || (cover.endsWith("focus.webp") ? "Conceptual artwork of a chrome timer and blue paper against orange" : "Conceptual artwork of cobalt steps and an orange sphere") } width={1536} height={1024} fetchPriority="high" /><figcaption>{post.coverCredit || (!post.coverUrl ? "Conceptual illustration generated for CoachRank." : "")}</figcaption></figure>
      <div className="article-layout">
        <aside className="article-sidebar">{headings.length ? <nav aria-label="In this article"><p className="journal-label">In this article</p><ol>{headings.map(heading => <li key={heading.id}><a href={`#${heading.id}`} dangerouslySetInnerHTML={{__html:heading.text}} /></li>)}</ol></nav> : null}<a href={`https://x.com/intent/post?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(absoluteUrl(`/blog/${post.slug}`))}`} target="_blank" rel="noopener noreferrer" className="article-share">Share on X ↗</a></aside>
        <div className="article-content">
          {post.keyAnswer ? <aside className="article-answer"><p className="journal-label">The short answer</p><p>{post.keyAnswer}</p></aside> : null}
          <div className="prose-doc article-prose" dangerouslySetInnerHTML={{__html:html}} />
          {post.faqs.length ? <section className="article-faqs" id="questions"><h2>Questions worth asking</h2>{post.faqs.map((faq,index) => <details key={index}><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}</section> : null}
          {post.sources.length ? <section className="article-sources"><h2>Sources & further reading</h2><ul>{post.sources.map((source,index) => <li key={index}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title} ↗</a></li>)}</ul></section> : null}
          <footer className="article-author"><p className="journal-label">Written by</p><h2>{post.authorName}</h2><p>{post.authorBio}</p>{post.authorUrl ? <a href={post.authorUrl} className="buy">More about the author ↗</a> : null}</footer>
          {post.tags.length ? <div className="article-tags">{post.tags.map(tag => <span key={tag}>{tag}</span>)}</div> : null}
          {cta ? <div className="article-directory" role="complementary" data-nosnippet><p className="journal-label">Paid coach directory</p><p>Exploring {cta.label.toLowerCase()} coaching? Our listings link to coaches’ own websites. Positions are bought through bidding and do not indicate quality or editorial endorsement.</p><Link href={`/coaches/${cta.slug}`} className="buy mt-3">Browse {cta.label.toLowerCase()} coaches ↗</Link></div> : null}
        </div>
      </div>
    </article>
    {related.length ? <section className="journal-latest article-related" data-nosnippet><div className="journal-section-title"><h2>Keep the ideas coming<span>.</span></h2><Link href="/" className="buy">All stories ↗</Link></div><div className="journal-grid">{related.map(item => <article className="journal-card" key={item.id}><Link href={`/blog/${item.slug}`}><div className="journal-card-image"><img src={coverFor(item)} alt={item.coverAlt || ""} width={1536} height={1024} loading="lazy" /><span className="journal-card-arrow">↗</span></div><p className="journal-label">{topicLabel(item.topic)} <span>{readingMinutes(item.markdownBody)} min</span></p><h3>{item.title}</h3></Link></article>)}</div></section> : null}
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:jsonLd(structured)}} />
  </div>;
}
