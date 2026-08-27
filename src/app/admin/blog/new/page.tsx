import { PostEditor } from "@/components/admin/PostEditor";
import { savePostAction } from "@/lib/domain/admin-actions";

export const dynamic = "force-dynamic";

export default function NewPostPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">New post</h1>
      <div className="mt-5">
        <PostEditor post={null} saveAction={savePostAction} />
      </div>
    </div>
  );
}
