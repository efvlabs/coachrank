import { ClaimButton } from "./ClaimButton";
import { formatCents } from "@/lib/money";

type Props = {
  claimCents: number;
  categoryLabel?: string;
  timeframe?: "all-time" | "today";
};

/** An empty board is an opening, not a failure. */
export function EmptyBoard({ claimCents, categoryLabel, timeframe = "all-time" }: Props) {
  const headline =
    timeframe === "today"
      ? "Nothing moved in 24 hours."
      : categoryLabel
        ? `No ${categoryLabel.toLowerCase()} coaches yet.`
        : "Nobody has claimed #1.";

  return (
    <div className="card border-dashed bg-tint px-6 py-14 text-center">
      <p className="display text-[clamp(1.5rem,4.5vw,2.25rem)]">{headline}</p>
      <p className="display tnum mt-5 text-[clamp(2.75rem,9vw,4.5rem)] text-accent">
        {formatCents(claimCents)}
      </p>
      <div className="mt-6">
        <ClaimButton
          targetCents={claimCents}
          variant="primary"
          label={timeframe === "today" ? "Get on today" : "Be the first"}
        />
      </div>
    </div>
  );
}
