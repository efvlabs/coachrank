import { SpotlightCard } from "./SpotlightCard";
import type { Pricing } from "@/lib/config";
import type { ActiveSpotlight } from "@/lib/domain/types";

type Props = {
  spotlights: { premium: ActiveSpotlight | null; standard: ActiveSpotlight | null };
  pricing: Pricing;
  nowMs: number;
  /** Sits directly above the board and shares its width - the category tabs. */
  toolbar?: React.ReactNode;
  children: React.ReactNode;
};

/**
 * Wide screens: one ad slot either side of the board, all three starting level, with the
 * toolbar in its own row above the board so the tabs match the board's width.
 * Narrower: tabs, board, then the two slots paired beneath it.
 *
 * `order` is only reset at xl, where explicit grid placement takes over - resetting it
 * earlier would float the ads above the board.
 */
export function SpotlightRail({ spotlights, pricing, nowMs, toolbar, children }: Props) {
  return (
    <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2 xl:grid-cols-[196px_minmax(0,1fr)_196px]">
      {toolbar ? (
        <div className="order-1 min-w-0 sm:col-span-2 xl:order-none xl:col-span-1 xl:col-start-2 xl:row-start-1">
          {toolbar}
        </div>
      ) : null}

      <div className="order-2 min-w-0 sm:col-span-2 xl:order-none xl:col-span-1 xl:col-start-2 xl:row-start-2">
        {children}
      </div>

      <div className="order-3 min-w-0 xl:order-none xl:col-start-1 xl:row-start-2 xl:self-start">
        <SpotlightCard
          slot="standard"
          booking={spotlights.standard}
          priceCents={pricing.standardSpotlightCents}
          nowMs={nowMs}
        />
      </div>

      <div className="order-4 min-w-0 xl:order-none xl:col-start-3 xl:row-start-2 xl:self-start">
        <SpotlightCard
          slot="premium"
          booking={spotlights.premium}
          priceCents={pricing.premiumSpotlightCents}
          nowMs={nowMs}
        />
      </div>
    </div>
  );
}
