import Link from "next/link";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { AdminSignOut } from "@/components/admin/AdminSignOut";
import { AdminNav } from "@/components/admin/AdminNav";
import { Logo } from "@/components/Logo";
import { getAdminUser } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "CoachRank Studio", robots: { index: false, follow: false, nocache: true } };
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user=await getAdminUser();
  if (!user) return <div className="admin-login-shell"><div className="admin-login-story"><Logo size={38} /><p className="journal-label">CoachRank Studio</p><h1>Make something<br />worth reading.<br /><span>And returning to.</span></h1><p>Your editorial, your tools, your next chapter. A considered space to build CoachRank.</p><Link href="/" className="tool-text-link">Back to the editorial ↗</Link></div><div className="admin-login-form"><AdminLogin /></div></div>;
  return <div className="admin-console"><aside className="admin-sidebar"><Link href="/admin" className="admin-studio-brand"><span><Logo size={29} /><small>STUDIO</small></span></Link><AdminNav /><div className="admin-sidebar-note"><p>Celebrating greatness.<br />Understanding what builds it.</p><Link href="/" className="tool-text-link">View publication ↗</Link></div></aside><div className="admin-main"><header className="admin-topline"><p>Independent thinking. Considered work.</p><div><span title={user.email}>{user.email}</span><AdminSignOut /></div></header><div className="admin-content">{children}</div></div></div>;
}
