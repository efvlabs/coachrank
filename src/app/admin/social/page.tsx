import { getAdminUser } from "@/lib/admin-auth";
import { getPublishedPosts } from "@/lib/domain/blog";
import { listSocialRecords } from "@/lib/domain/social";
import { SocialWorkspace } from "@/components/admin/SocialWorkspace";

export const dynamic = "force-dynamic";
export default async function SocialPage() {
  if (!await getAdminUser()) return null;
  const [records, posts] = await Promise.all([listSocialRecords(), getPublishedPosts(200)]);
  return <SocialWorkspace initialRecords={records} articles={posts.map(post => ({ id: post.id, title: post.title, slug: post.slug, topic: post.topic, coverUrl: post.coverUrl }))} />;
}
