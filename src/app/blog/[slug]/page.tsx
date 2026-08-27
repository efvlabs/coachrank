import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CATEGORIES, getCategory } from "@/lib/categories";
import { indefiniteArticle } from "@/lib/format";
import { BLOG_ENABLED, SITE, absoluteUrl } from "@/lib/config";
import { getPublishedPostBySlug, getPublishedPosts } from "@/lib/domain/blog";
import { readingMinutes, renderMarkdown } from "@/lib/markdown";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  if (!BLOG_ENABLED) return { title: "Not found", robots: { index: false, follow: false } };
  const post = await getPublishedPostBySlug(slug);
  if (!post) return { title: "Article not found", robots: { index: false, follow: false } };

  return {
    title: post.seoTitle || post.title,
    description: post.metaDescription || post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.seoTitle || post.title,
      description: post.metaDescription || post.excerpt,
      url: absoluteUrl(`/blog/${post.slug}`),
      publishedTime: post.publishedAtMs ? new Date(post.publishedAtMs).toISOString() : undefined,
      modifiedTime: new Date(post.updatedAtMs).toISOString(),
      siteName: SITE.name,
    },
    twitter: {
      card: "summary_large_image",
      title: post.seoTitle || post.title,
      description: post.metaDescription || post.excerpt,
    },
  };
}

function formatDate(ms: number | null): string {
  if (!ms) return "";
  return new Date(ms).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default async function BlogPostPage({ params }: PageProps<"/blog/[slug]">) {
  // Written and editable in /admin, but not public until the flag is switched on.
  if (!BLOG_ENABLED) notFound();

  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);
  if (!post) notFound();

  const [html, related] = await Promise.all([
    Promise.resolve(renderMarkdown(post.markdownBody)),
    getPublishedPosts(4),
  ]);

  const cta = post.ctaCategory ? getCategory(post.ctaCategory) : null;
  const others = related.filter((p) => p.id !== post.id).slice(0, 3);

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.metaDescription || post.excerpt,
    datePublished: post.publishedAtMs ? new Date(post.publishedAtMs).toISOString() : undefined,
    dateModified: new Date(post.updatedAtMs).toISOString(),
    mainEntityOfPage: { "@type": "WebPage", "@id": absoluteUrl(`/blog/${post.slug}`) },
    author: { "@type": "Organization", name: SITE.name, url: SITE.url },
    publisher: { "@type": "Organization", name: SITE.name, url: SITE.url },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
      { "@type": "ListItem", position: 2, name: "Blog", item: absoluteUrl("/blog") },
      { "@type": "ListItem", position: 3, name: post.title, item: absoluteUrl(`/blog/${post.slug}`) },
    ],
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <nav aria-label="Breadcrumb" className="text-[12.5px] text-ink-3">
        <Link href="/blog" className="hover:text-accent">
          Blog
        </Link>
      </nav>

      <article className="mt-4">
        <header>
          <h1 className="text-3xl font-semibold leading-[1.15] tracking-tight sm:text-[2.5rem]">
            {post.title}
          </h1>
          <p className="mt-3 text-[12.5px] text-ink-3">
            <time dateTime={post.publishedAtMs ? new Date(post.publishedAtMs).toISOString() : undefined}>
              {formatDate(post.publishedAtMs)}
            </time>{" "}
            · {readingMinutes(post.markdownBody)} min read
          </p>
          {post.excerpt ? (
            <p className="mt-5 border-l-2 border-coral pl-4 text-[16px] leading-relaxed text-ink-2">
              {post.excerpt}
            </p>
          ) : null}
        </header>

        <div className="prose-doc mt-8" dangerouslySetInnerHTML={{ __html: html }} />
      </article>

      {/* ---- Blog → leaderboard loop ---- */}
      <aside className="card mt-12 p-6">
        {cta ? (
          <>
            <h2 className="text-xl font-semibold tracking-tight">
              Looking for {indefiniteArticle(cta.label)} {cta.label.toLowerCase()} coach?
            </h2>
            <p className="mt-2 text-[14.5px] leading-relaxed text-ink-3">
              The CoachRank {cta.label} board lists coaches by how much they have paid for their
              position. It is not a quality ranking — but every listing links straight to the
              coach&apos;s own site, so you can judge for yourself.
            </p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <Link
                href={`/coaches/${cta.slug}`}
                className="btn btn-primary px-5 py-2.5 text-[13px]"
              >
                Explore {cta.label} coaches →
              </Link>
            </div>
            <p className="mt-5 border-t border-line pt-4 text-[14px] text-ink-3">
              <strong className="font-semibold text-ink">
                Are you {indefiniteArticle(cta.label)} {cta.label.toLowerCase()} coach?
              </strong>{" "}
              <Link href="/#bid" className="font-semibold text-accent hover:underline">
                Claim your rank →
              </Link>
            </p>
          </>
        ) : (
          <>
            <h2 className="text-xl font-semibold tracking-tight">
              Browse the coach leaderboards
            </h2>
            <p className="mt-2 text-[14.5px] leading-relaxed text-ink-3">
              Every category is ranked by money bid, and every listing links straight to the
              coach&apos;s own website.
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/coaches/${c.slug}`}
                    className="btn btn-ghost px-3.5 py-1.5 text-[12.5px]"
                  >
                    {c.label}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-5 border-t border-line pt-4 text-[14px] text-ink-3">
              <strong className="font-semibold text-ink">Are you a coach?</strong>{" "}
              <Link href="/#bid" className="font-semibold text-accent hover:underline">
                Claim your rank →
              </Link>
            </p>
          </>
        )}
      </aside>

      {others.length > 0 ? (
        <section className="mt-12">
          <h2 className="text-[15px] font-semibold uppercase tracking-[0.08em]">
            Keep reading
          </h2>
          <ul className="mt-3 divide-y divide-line border-y border-line">
            {others.map((other) => (
              <li key={other.id}>
                <Link href={`/blog/${other.slug}`} className="block py-3.5 hover:text-accent">
                  <span className="text-[15px] font-bold">{other.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
    </div>
  );
}
