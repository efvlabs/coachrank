import { getAdminUser } from "@/lib/admin-auth";
import { getPublishedPosts } from "@/lib/domain/blog";
import { listSocialRecords } from "@/lib/domain/social";
import { SocialWorkspace } from "@/components/admin/SocialWorkspace";
import { listQotds } from "@/lib/domain/qotd";

export const dynamic = "force-dynamic";
export default async function SocialPage({ searchParams }: PageProps<"/admin/social">) {
  if (!await getAdminUser()) return null;
  const [records, posts, quotes, params] = await Promise.all([listSocialRecords(), getPublishedPosts(200), listQotds(), searchParams]);
  return <SocialWorkspace initialRecords={records} initialQuotes={quotes} initialQotd={params.tab === "qotd"} articles={posts.map(post => ({ id: post.id, title: post.title, slug: post.slug, topic: post.topic, coverUrl: post.coverUrl }))} />;
}
