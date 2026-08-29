import Link from "next/link";
import { notFound } from "next/navigation";

import { BLOG_ENABLED, SITE, absoluteUrl } from "@/lib/config";
import { getPublishedPosts } from "@/lib/domain/blog";
import { readingMinutes } from "@/lib/markdown";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Blog - hiring a coach, plainly explained",
  description:
    "Practical, plainly written guides on hiring and working with coaches: what coaching costs, coach vs consultant, when to hire one, and how to choose.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: `Blog · ${SITE.name}`,
    description: "Practical guides on hiring and working with coaches.",
    url: absoluteUrl("/blog"),
    type: "website",
  },
};

function formatDate(ms: number | null): string {
  if (!ms) return "";
  return new Date(ms).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default async function BlogIndexPage() {
  // Written and editable in /admin, but not public until the flag is switched on.
  if (!BLOG_ENABLED) notFound();

  const posts = await getPublishedPosts(50);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          The CoachRank blog
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-3">
          Straight answers about hiring a coach - what it costs, what to ask, and how to read a
          directory that is honest about being paid for.
        </p>
      </header>

      {posts.length === 0 ? (
        <div className="card mt-8 border-dashed px-6 py-12 text-center">
          <p className="text-lg font-semibold text-ink">Nothing published yet.</p>
          <p className="mt-2 text-[14px] text-ink-3">
            Articles are written and reviewed by hand. The first ones are on the way.
          </p>
          <Link href="/" className="btn btn-ghost mt-5 px-5 py-2.5 text-[13px]">
            Back to the leaderboard
          </Link>
        </div>
      ) : (
        <ul className="mt-10 grid gap-x-7 gap-y-10 sm:grid-cols-2">
          {posts.map((post, index) => (
            <li key={post.id} className={index === 0 ? "sm:col-span-2" : undefined}>
              <Link href={`/blog/${post.slug}`} className="group block">
                {/*
                  The card image is the article's own Open Graph card, generated from its
                  title - so a post has artwork the moment it publishes, and the preview
                  here is exactly what someone sees when the link is shared.
                */}
                <div className="overflow-hidden rounded-2xl border border-line bg-tint">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/blog/${post.slug}/opengraph-image`}
                    alt=""
                    width={1200}
                    height={630}
                    loading={index === 0 ? "eager" : "lazy"}
                    className="aspect-[1200/630] w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                </div>

                <h2
                  className={`mt-4 font-semibold leading-snug tracking-tight text-ink group-hover:text-accent ${
                    index === 0 ? "text-[26px] sm:text-[30px]" : "text-[19px]"
                  }`}
                >
                  {post.title}
                </h2>

                {post.excerpt ? (
                  <p className="mt-2 max-w-[62ch] text-[14.5px] leading-relaxed text-ink-3">
                    {post.excerpt}
                  </p>
                ) : null}

                <p className="mt-2.5 text-[12px] text-ink-3">
                  {formatDate(post.publishedAtMs)} · {readingMinutes(post.markdownBody)} min read
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
