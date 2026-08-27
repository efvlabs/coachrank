import Link from "next/link";
import { notFound } from "next/navigation";

import { BLOG_ENABLED, SITE, absoluteUrl } from "@/lib/config";
import { getPublishedPosts } from "@/lib/domain/blog";
import { readingMinutes } from "@/lib/markdown";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Blog — coaching, plainly explained",
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
          Straight answers about hiring and working with coaches — what it costs, when it helps, and
          how to tell the difference between a coach, a consultant and a mentor.
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
        <ul className="mt-8 divide-y divide-line border-y border-line">
          {posts.map((post) => (
            <li key={post.id}>
              <Link href={`/blog/${post.slug}`} className="group block py-5">
                <h2 className="text-xl font-semibold leading-snug tracking-tight text-ink group-hover:text-accent">
                  {post.title}
                </h2>
                {post.excerpt ? (
                  <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-3">
                    {post.excerpt}
                  </p>
                ) : null}
                <p className="mt-2 text-[12px] text-ink-3">
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
