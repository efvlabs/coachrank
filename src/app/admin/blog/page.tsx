import Link from "next/link";
import { listAllPosts } from "@/lib/domain/blog";
import { getAdminUser } from "@/lib/admin-auth";
import { EditorialLibrary } from "@/components/admin/EditorialLibrary";

export const dynamic = "force-dynamic";
export default async function AdminBlogPage() {
  if (!await getAdminUser()) return null;
  const posts=await listAllPosts(200);
  return <div><div className="admin-page-heading"><div><p className="journal-label">CoachRank Editorial</p><h1>Stories with something to say.</h1><p>Your drafts, published pieces and next great question, all in one place.</p></div><Link href="/admin/blog/new" className="tool-button">New article ↗</Link></div><div className="admin-metrics admin-metrics-three">{[{label:"Published",value:posts.filter(post=>post.status==="published").length,detail:"Out in the world"},{label:"Drafts",value:posts.filter(post=>post.status==="draft").length,detail:"Room to find the right words"},{label:"Featured",value:posts.filter(post=>post.featured && post.status==="published").length,detail:"Leading the conversation"}].map(item=><div className="admin-metric" key={item.label}><p>{item.label}</p><strong>{item.value}</strong><span>{item.detail}</span></div>)}</div><EditorialLibrary posts={posts} /></div>;
}
