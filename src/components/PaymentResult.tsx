"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Confetti } from "./Confetti";
import { ShareRank } from "./ShareRank";
import { SpotlightCountdown } from "./SpotlightCountdown";
import { absoluteUrl } from "@/lib/config";
import { formatCents } from "@/lib/money";

type BidStatus = {
  kind: "bid";
  status: "pending" | "paid" | "failed";
  standingBidCents?: number | null;
  overallRank?: number | null;
  categoryRank?: number | null;
  slug?: string | null;
};

type SpotlightStatus = {
  kind: "spotlight";
  status: "pending" | "active" | "expired" | "failed";
  endsAtMs?: number | null;
  slot?: "premium" | "standard";
};

type Props = {
  paymentId?: string;
  bookingId?: string;
  initial: BidStatus | SpotlightStatus | null;
  coachName: string | null;
  categoryLabel: string | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const POLL_MS = 2500;
const MAX_WAIT_MS = 90_000;

/**
 * A redirect is never proof of payment. Nothing here is shown as confirmed until the
 * verified webhook has been processed server-side.
 */
export function PaymentResult({ paymentId, bookingId, initial, coachName, categoryLabel }: Props) {
  const [state, setState] = useState(initial);
  const [timedOut, setTimedOut] = useState(false);

  const settled =
    state?.kind === "bid"
      ? state.status === "paid" || state.status === "failed"
      : state?.status === "active" || state?.status === "failed";

  useEffect(() => {
    if (settled || (!paymentId && !bookingId)) return;
    const startedAt = Date.now();
    const query = bookingId ? `s=${bookingId}` : `p=${paymentId}`;

    const timer = setInterval(async () => {
      if (Date.now() - startedAt > MAX_WAIT_MS) {
        setTimedOut(true);
        clearInterval(timer);
        return;
      }
      try {
        const response = await fetch(`/api/payment-status?${query}`, { cache: "no-store" });
        const data = await response.json();
        if (data?.ok) setState(data as BidStatus | SpotlightStatus);
      } catch {
        // Keep waiting; the webhook may simply be in flight.
      }
    }, POLL_MS);

    return () => clearInterval(timer);
  }, [settled, paymentId, bookingId]);

  if (state === null || !settled) {
    return (
      <div className="py-14 text-center">
        <p className="eyebrow">Confirming</p>
        <h1 className="display mt-4 text-[clamp(1.75rem,5vw,2.5rem)] leading-none">
          Waiting on the payment
        </h1>
        <p className="mx-auto mt-4 max-w-[42ch] text-[14.5px] leading-[1.55] text-ink-2">
          {timedOut
            ? "This is taking longer than usual. Your payment is safe — if it succeeded, the board updates itself the moment we receive confirmation."
            : "A listing is published only once Dodo confirms the charge to our server. This usually takes a few seconds."}
        </p>
        <Link href="/" className="btn btn-quiet mt-7 px-6 py-3">
          View the board
        </Link>
      </div>
    );
  }

  if (state.kind === "spotlight") {
    if (state.status !== "active") {
      return (
        <div className="py-14 text-center">
          <h1 className="display text-[clamp(1.75rem,5vw,2.5rem)] leading-none">
            That spotlight could not be activated
          </h1>
          <p className="mx-auto mt-4 max-w-[42ch] text-[14.5px] leading-[1.55] text-ink-2">
            The slot was taken before your payment cleared. It is flagged for a refund — nothing
            was double-booked.
          </p>
          <Link href="/" className="btn btn-quiet mt-7 px-6 py-3">
            Back to the board
          </Link>
        </div>
      );
    }

    return (
      <div className="py-14 text-center">
        <p className="eyebrow">{state.slot === "premium" ? "Premium spotlight" : "Spotlight"}</p>
        <h1 className="display mt-4 text-[clamp(2.25rem,7vw,3.5rem)] leading-none">You&apos;re live</h1>
        <p className="meta mt-5">
          {state.endsAtMs ? (
            <SpotlightCountdown endsAtMs={state.endsAtMs} nowMs={state.endsAtMs - DAY_MS} />
          ) : (
            "Running for the next 24 hours"
          )}
        </p>
        <Link href="/" className="btn btn-primary mt-7 px-6 py-3">
          See it on the board
        </Link>
      </div>
    );
  }

  if (state.status === "failed") {
    return (
      <div className="py-14 text-center">
        <h1 className="display text-[clamp(1.75rem,5vw,2.5rem)] leading-none">
          That payment did not go through
        </h1>
        <p className="mx-auto mt-4 max-w-[40ch] text-[14.5px] leading-[1.55] text-ink-2">
          Nothing was charged and nothing changed on the board.
        </p>
        <Link href="/#claim" className="btn btn-primary mt-7 px-6 py-3">
          Try again
        </Link>
      </div>
    );
  }

  const isTop = state.overallRank === 1;
  const shareUrl = state.slug ? absoluteUrl(`/r/${state.slug}`) : absoluteUrl("/");

  return (
    <>
      {isTop ? <Confetti /> : null}

      <div className="bg-deep px-6 py-12 text-center text-white sm:px-10">
        <p className="eyebrow text-white/70">{isTop ? "Top of the board" : "On the board"}</p>
        <h1 className="display mt-4 text-[clamp(2.5rem,9vw,4.5rem)] leading-[0.92]">
          {isTop ? "You're #1" : "You're listed"}
        </h1>
        {coachName ? <p className="meta mt-4 text-white/70">{coachName}</p> : null}

        <p className="display tnum mt-9 text-[clamp(3rem,11vw,5.5rem)] leading-none text-on-deep">
          {formatCents(state.standingBidCents ?? 0)}
        </p>
        <p className="eyebrow mt-2 text-white/70">standing bid</p>

        <dl className="mx-auto mt-9 flex max-w-[22rem] justify-center gap-12">
          <div>
            <dt className="eyebrow text-white/70">Overall</dt>
            <dd className="display tnum mt-2 text-[28px] leading-none">
              #{state.overallRank ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="eyebrow text-white/70">{categoryLabel ?? "Category"}</dt>
            <dd className="display tnum mt-2 text-[28px] leading-none">
              #{state.categoryRank ?? "—"}
            </dd>
          </div>
        </dl>

        <p className="meta mt-9 text-white/70">Someone can take it. For now it&apos;s yours.</p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="btn btn-on-deep px-6 py-3"
          >
            View the board
          </Link>
          {state.slug ? (
            <Link
              href={`/r/${state.slug}`}
              className="btn px-6 py-3 border-white/30 text-white hover:border-white"
            >
              Your rank page
            </Link>
          ) : null}
        </div>
      </div>

      <ShareRank
        url={shareUrl}
        name={coachName ?? "This coach"}
        overallRank={state.overallRank ?? 0}
        categoryRank={state.categoryRank ?? 0}
        categoryLabel={categoryLabel ?? ""}
      />
    </>
  );
}
