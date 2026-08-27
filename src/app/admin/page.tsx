import Link from "next/link";

import { getRankedBoard, listAllListings } from "@/lib/domain/listings";
import { listRecentPayments } from "@/lib/domain/payments";
import { getSiteStats } from "@/lib/domain/stats";
import { isFirebaseConfigured } from "@/lib/firebase/admin";
import { isDodoConfigured } from "@/lib/dodo";
import { formatCents, formatCount } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const [stats, board, all, payments] = await Promise.all([
    getSiteStats(),
    getRankedBoard(),
    listAllListings(500),
    listRecentPayments(50),
  ]);

  const pending = all.filter((l) => l.status === "pending").length;
  const hidden = all.filter((l) => l.status === "hidden").length;
  const paidCount = payments.filter((p) => p.status === "paid").length;

  const tiles = [
    { label: "Listed coaches", value: formatCount(board.length) },
    { label: "Pending (unpaid)", value: formatCount(pending) },
    { label: "Hidden", value: formatCount(hidden) },
    { label: "Visitors", value: formatCount(stats.visitors) },
    { label: "Outbound clicks", value: formatCount(stats.outboundClicks) },
    { label: "Leaderboard revenue", value: formatCents(stats.leaderboardRevenueCents) },
    { label: "Spotlight revenue", value: formatCents(stats.spotlightRevenueCents) },
    { label: "Paid payments (last 50)", value: formatCount(paidCount) },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>

      <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <li key={tile.label} className="card p-4">
            <p className="text-[11.5px] font-semibold uppercase tracking-wider text-ink-3">
              {tile.label}
            </p>
            <p className="tnum mt-1 text-2xl font-semibold text-ink">{tile.value}</p>
          </li>
        ))}
      </ul>

      <section className="card mt-6 p-5">
        <h2 className="text-lg font-semibold tracking-tight">Configuration</h2>
        <ul className="mt-3 space-y-2 text-[14px]">
          <li className="flex items-center gap-2">
            <StatusDot ok={isFirebaseConfigured()} />
            Firebase Admin {isFirebaseConfigured() ? "connected" : "not configured"}
          </li>
          <li className="flex items-center gap-2">
            <StatusDot ok={isDodoConfigured()} />
            Dodo Payments {isDodoConfigured() ? "configured" : "not configured - checkout disabled"}
          </li>
          <li className="flex items-center gap-2">
            <StatusDot ok={Boolean(process.env.DODO_PAYMENTS_WEBHOOK_KEY)} />
            Webhook key {process.env.DODO_PAYMENTS_WEBHOOK_KEY ? "set" : "missing - webhooks rejected"}
          </li>
        </ul>
      </section>

      <p className="mt-6 text-[13px] text-ink-3">
        Payments are read-only here by design.{" "}
        <Link href="/admin/payments" className="text-accent hover:underline">
          View the payment log →
        </Link>
      </p>
    </div>
  );
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span aria-hidden="true"
      className={`inline-block h-2 w-2 shrink-0 rounded-full ${ok ? "bg-accent" : "bg-accent"}`}
    />
  );
}
