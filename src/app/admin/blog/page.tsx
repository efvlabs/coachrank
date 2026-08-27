import Link from "next/link";

import { listAllPosts } from "@/lib/domain/blog";

export const dynamic = "force-dynamic";

export default async function AdminBlogPage() {
  const posts = await listAllPosts(200);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Blog</h1>
        <Link href="/admin/blog/new" className="btn btn-primary px-4 py-2 text-[13px]">
          New post
        </Link>
      </div>

      {posts.length === 0 ? (
        <p className="card mt-6 p-6 text-[14px] text-ink-3">
          No posts yet. Articles are written and reviewed by hand - nothing is auto-published.
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-line border-y border-line">
          {posts.map((post) => (
            <li key={post.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
              <div className="min-w-0">
                <Link
                  href={`/admin/blog/${post.id}`}
                  className="text-[15px] font-bold hover:text-accent"
                >
                  {post.title}
                </Link>
                <p className="mt-0.5 font-mono text-[11.5px] text-ink-3">/blog/{post.slug}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`pill ${post.status === "published" ? "border-accent" : ""}`}>
                  {post.status}
                </span>
                {post.status === "published" ? (
                  <Link
                    href={`/blog/${post.slug}`}
                    className="text-[12.5px] font-semibold text-ink-3 hover:text-accent"
                  >
                    View →
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
