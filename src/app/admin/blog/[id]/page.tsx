import { notFound } from "next/navigation";

import { PostEditor } from "@/components/admin/PostEditor";
import { deletePostAction, savePostAction } from "@/lib/domain/admin-actions";
import { getPostById } from "@/lib/domain/blog";

export const dynamic = "force-dynamic";

export default async function EditPostPage({ params }: PageProps<"/admin/blog/[id]">) {
  const { id } = await params;
  const post = await getPostById(id);
  if (!post) notFound();

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Edit post</h1>
      <div className="mt-5">
        <PostEditor post={post} saveAction={savePostAction} deleteAction={deletePostAction} />
      </div>
    </div>
  );
}
