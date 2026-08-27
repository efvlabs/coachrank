import { getListingById } from "@/lib/domain/listings";
import { listSpotlightBookings } from "@/lib/domain/spotlight";
import { formatCents } from "@/lib/money";

export const dynamic = "force-dynamic";

function stamp(ms: number | null): string {
  return ms ? new Date(ms).toISOString().replace("T", " ").slice(0, 16) : "—";
}

export default async function AdminSpotlightsPage() {
  const bookings = await listSpotlightBookings(80);
  const listings = await Promise.all(bookings.map((b) => getListingById(b.listingId)));

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Spotlights</h1>
      <p className="mt-1.5 text-[14px] text-ink-3">
        Current and past rentals. Each active booking runs for exactly 24 hours from the verified
        payment.
      </p>

      {bookings.length === 0 ? (
        <p className="card mt-6 p-6 text-[14px] text-ink-3">No Spotlight rentals yet.</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-line text-left text-[11.5px] uppercase tracking-wider text-ink-3">
                <th className="py-2 pr-3 font-semibold">Slot</th>
                <th className="py-2 pr-3 font-semibold">Coach</th>
                <th className="py-2 pr-3 font-semibold">Status</th>
                <th className="py-2 pr-3 font-semibold">Price</th>
                <th className="py-2 pr-3 font-semibold">Starts</th>
                <th className="py-2 pr-3 font-semibold">Ends</th>
                <th className="py-2 pr-3 font-semibold">Clicks</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking, index) => (
                <tr key={booking.id} className="border-b border-line">
                  <td className="py-2 pr-3 font-semibold capitalize">{booking.slot}</td>
                  <td className="py-2 pr-3">{listings[index]?.name ?? "—"}</td>
                  <td className="py-2 pr-3">
                    <span
                      className={`pill ${booking.status === "active" ? "border-accent" : booking.status === "failed" ? "border-line-2" : ""}`}
                    >
                      {booking.status}
                    </span>
                  </td>
                  <td className="tnum py-2 pr-3">{formatCents(booking.priceCents)}</td>
                  <td className="py-2 pr-3 text-ink-3">{stamp(booking.startsAtMs)}</td>
                  <td className="py-2 pr-3 text-ink-3">{stamp(booking.endsAtMs)}</td>
                  <td className="tnum py-2 pr-3">{booking.totalClicks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
