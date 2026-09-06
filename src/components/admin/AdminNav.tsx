"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const groups = [
  { label:"Your publication", links:[{href:"/admin",label:"Overview",icon:"◫"},{href:"/admin/blog",label:"Editorial desk",icon:"▤"},{href:"/admin/tools",label:"Tools & feedback",icon:"◇"},{href:"/admin/social",label:"Social desk",icon:"◎"}] },
  { label:"The business", links:[{href:"/admin/coaches",label:"Coach rankings",icon:"↗"},{href:"/admin/payments",label:"Board payments",icon:"≋"},{href:"/admin/settings",label:"Settings",icon:"⊙"},{href:"/admin/spotlights",label:"Spotlight archive",icon:"□"}] },
];
export function AdminNav() {
  const path = usePathname();
  return <nav aria-label="Admin" className="admin-nav">{groups.map(group=><div key={group.label}><p>{group.label}</p>{group.links.map(link=><Link key={link.href} href={link.href} aria-current={path===link.href || link.href!=="/admin" && path.startsWith(`${link.href}/`) ? "page" : undefined}><span aria-hidden="true">{link.icon}</span>{link.label}</Link>)}</div>)}</nav>;
}
