import Link from "next/link";

import { AdminLogin } from "@/components/admin/AdminLogin";
import { AdminSignOut } from "@/components/admin/AdminSignOut";
import { getAdminUser } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin",
  robots: { index: false, follow: false, nocache: true },
};

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/coaches", label: "Coaches" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/spotlights", label: "Spotlights" },
  { href: "/admin/blog", label: "Blog" },
  { href: "/admin/settings", label: "Settings" },
] as const;

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await getAdminUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-sm px-4 py-20 sm:px-6">
        <AdminLogin />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <p className="text-lg font-semibold tracking-tight">Admin</p>
          <p className="text-[12px] text-ink-3">{user.email}</p>
        </div>
        <AdminSignOut />
      </header>

      <nav aria-label="Admin" className="rail mt-4 py-1">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-full border border-line bg-paper px-3.5 py-1.5 text-[13px] font-semibold text-ink-2 hover:border-ink-muted hover:text-ink"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="mt-8">{children}</div>
    </div>
  );
}
