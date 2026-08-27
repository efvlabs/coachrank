import { listRecentPayments } from "@/lib/domain/payments";
import { formatCents } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage() {
  const payments = await listRecentPayments(150);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
      <p className="mt-1.5 text-[14px] text-ink-3">
        Read-only. Payment records are immutable - they are the audit trail for every position on
        the board.
      </p>

      {payments.length === 0 ? (
        <p className="card mt-6 p-6 text-[14px] text-ink-3">No payments yet.</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-line text-left text-[11.5px] uppercase tracking-wider text-ink-3">
                <th className="py-2 pr-3 font-semibold">Created</th>
                <th className="py-2 pr-3 font-semibold">Status</th>
                <th className="py-2 pr-3 font-semibold">Charged</th>
                <th className="py-2 pr-3 font-semibold">Before</th>
                <th className="py-2 pr-3 font-semibold">After</th>
                <th className="py-2 pr-3 font-semibold">Rank</th>
                <th className="py-2 pr-3 font-semibold">Listing</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} className="border-b border-line">
                  <td className="py-2 pr-3 text-ink-3">
                    {new Date(payment.createdAtMs).toISOString().replace("T", " ").slice(0, 16)}
                  </td>
                  <td className="py-2 pr-3">
                    <span
                      className={`pill ${payment.status === "paid" ? "border-accent" : payment.status === "failed" ? "border-line-2" : ""}`}
                    >
                      {payment.status}
                    </span>
                  </td>
                  <td className="tnum py-2 pr-3 font-semibold">
                    {formatCents(payment.incrementCents)}
                  </td>
                  <td className="tnum py-2 pr-3 text-ink-3">
                    {formatCents(payment.previousStandingBidCents)}
                  </td>
                  <td className="tnum py-2 pr-3">
                    {payment.resultingStandingBidCents === null
                      ? "-"
                      : formatCents(payment.resultingStandingBidCents)}
                  </td>
                  <td className="tnum py-2 pr-3 text-ink-3">
                    {payment.resultingOverallRank ? `#${payment.resultingOverallRank}` : "-"}
                  </td>
                  <td className="py-2 pr-3 font-mono text-[11px] text-ink-3">
                    {payment.listingId.slice(0, 12)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
