import { CoachAvatar } from "./CoachAvatar";
import { SpotlightCountdown } from "./SpotlightCountdown";
import { SpotlightRentLazy } from "./SpotlightRentLazy";
import { categoryLabel } from "@/lib/categories";
import { formatCents, formatCount } from "@/lib/money";
import type { ActiveSpotlight, SpotlightSlot } from "@/lib/domain/types";

type Props = {
  slot: SpotlightSlot;
  booking: ActiveSpotlight | null;
  priceCents: number;
  nowMs: number;
};

const SOURCE: Record<SpotlightSlot, string> = {
  premium: "premium_spotlight",
  standard: "standard_spotlight",
};

/** An ad slot. It sits beside the board and changes nobody's rank. */
export function SpotlightCard({ slot, booking, priceCents, nowMs }: Props) {
  const occupied = booking && booking.endsAtMs && booking.endsAtMs > nowMs;

  if (occupied && booking) {
    return (
      <aside className="card p-4" aria-label="Sponsored">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-3">
            Sponsored
          </span>
          <span className="tnum text-[11.5px] text-ink-3">
            <SpotlightCountdown endsAtMs={booking.endsAtMs!} nowMs={nowMs} />
          </span>
        </div>

        <div className="mt-3 flex items-center gap-2.5">
          <CoachAvatar
            name={booking.advertiser.name}
            displayWebsite={booking.advertiser.displayWebsite}
            size={28}
            className="rounded-lg"
          />
          <div className="min-w-0">
            <p className="display truncate text-[15px]">{booking.advertiser.name}</p>
            <p className="truncate text-[12px] text-ink-3">
              {categoryLabel(booking.advertiser.category)}
            </p>
          </div>
        </div>


        <a
          href={`/go/s/${booking.id}?source=${SOURCE[slot]}`}
          rel="nofollow noopener sponsored"
          target="_blank"
          className="btn btn-quiet mt-4 w-full py-2"
        >
          Visit →
        </a>
        {booking.totalClicks > 0 ? (
          <p className="tnum mt-2 text-center text-[11.5px] text-ink-3">
            {formatCount(booking.totalClicks)} clicks
          </p>
        ) : null}
      </aside>
    );
  }

  return (
    <aside className="card border-dashed border-accent/30 bg-tint p-4" aria-label="Spotlight available">
      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-accent">Spotlight</p>
      <p className="display tnum mt-3 text-[32px] text-accent">{formatCents(priceCents)}</p>
      <p className="mt-0.5 text-[12.5px] text-ink-3">24 hours</p>

      <div className="mt-4">
        <SpotlightRentLazy slot={slot} priceCents={priceCents} label="Rent this spot" />
      </div>
      <p className="mt-2.5 text-[11.5px] leading-snug text-ink-3">Ad only. Changes no ranks.</p>
    </aside>
  );
}
