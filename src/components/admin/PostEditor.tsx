"use client";

import { useState } from "react";

import { AdminForm } from "./AdminForm";
import { CATEGORIES } from "@/lib/categories";
import type { ActionResult } from "@/lib/domain/admin-actions";
import { slugifyTitle } from "@/lib/markdown";
import type { BlogPost } from "@/lib/domain/types";

type Props = {
  post: BlogPost | null;
  saveAction: (formData: FormData) => Promise<ActionResult>;
  deleteAction?: (formData: FormData) => Promise<ActionResult>;
};

/** Plain Markdown editing with a live preview toggle — deliberately not a page builder. */
export function PostEditor({ post, saveAction, deleteAction }: Props) {
  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [body, setBody] = useState(post?.markdownBody ?? "");
  const [preview, setPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");

  async function togglePreview() {
    if (!preview) {
      const { renderMarkdown } = await import("@/lib/markdown");
      setPreviewHtml(renderMarkdown(body));
    }
    setPreview((v) => !v);
  }

  return (
    <div>
      <AdminForm action={saveAction} className="card p-5">
        {post ? <input type="hidden" name="id" value={post.id} /> : null}

        <label htmlFor="post-title" className="block text-[13px] font-medium">
          Title
        </label>
        <input id="post-title" name="title"
          className="field mt-1.5"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (!post) setSlug(slugifyTitle(e.target.value));
          }}
          required
        />

        <label htmlFor="post-slug" className="mt-3 block text-[13px] font-medium">
          Slug
        </label>
        <input id="post-slug" name="slug"
          className="field mt-1.5 font-mono text-[13px]"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          required
        />

        <label htmlFor="post-excerpt" className="mt-3 block text-[13px] font-medium">
          Excerpt
        </label>
        <textarea id="post-excerpt" name="excerpt"
          rows={2}
          className="field mt-1.5 resize-none"
          defaultValue={post?.excerpt ?? ""}
        />

        <div className="mt-3 flex items-center justify-between">
          <label htmlFor="post-body" className="text-[13px] font-medium">
            Body (Markdown)
          </label>
          <button type="button"
            onClick={togglePreview}
            className="text-[12.5px] font-semibold text-accent hover:underline"
          >
            {preview ? "Edit" : "Preview"}
          </button>
        </div>

        {preview ? (
          <div
            className="prose-doc mt-1.5 max-h-[520px] overflow-y-auto rounded-lg border border-line bg-tint p-4"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        ) : (
          <textarea id="post-body" name="markdownBody"
            rows={18}
            className="field mt-1.5 font-mono text-[13px] leading-relaxed"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
          />
        )}
        {preview ? <input type="hidden" name="markdownBody" value={body} /> : null}

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="post-seo" className="block text-[13px] font-medium">
              SEO title
            </label>
            <input id="post-seo" name="seoTitle"
              className="field mt-1.5"
              defaultValue={post?.seoTitle ?? ""}
            />
          </div>
          <div>
            <label htmlFor="post-cta" className="block text-[13px] font-medium">
              Leaderboard CTA category
            </label>
            <select id="post-cta" name="ctaCategory"
              className="field mt-1.5"
              defaultValue={post?.ctaCategory ?? ""}
            >
              <option value="">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label htmlFor="post-meta" className="mt-3 block text-[13px] font-medium">
          Meta description
        </label>
        <textarea id="post-meta" name="metaDescription"
          rows={2}
          className="field mt-1.5 resize-none"
          defaultValue={post?.metaDescription ?? ""}
        />

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button type="submit" name="status" value="draft"
            className="btn btn-ghost px-4 py-2 text-[13px]"
          >
            Save draft
          </button>
          <button type="submit" name="status" value="published"
            className="btn btn-primary px-4 py-2 text-[13px]"
          >
            {post?.status === "published" ? "Update published post" : "Publish"}
          </button>
          {post?.status === "published" ? (
            <span className="text-[12px] text-ink-3">
              Saving as a draft unpublishes this article.
            </span>
          ) : null}
        </div>
      </AdminForm>

      {post && deleteAction ? (
        <AdminForm action={deleteAction} className="mt-4">
          <input type="hidden" name="id" value={post.id} />
          <button type="submit" className="text-[12.5px] font-semibold text-accent hover:underline">
            Delete this post
          </button>
        </AdminForm>
      ) : null}
    </div>
  );
}
