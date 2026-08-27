"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { CATEGORIES, type CategorySlug } from "@/lib/categories";
import { CLAIM_EVENT, type ClaimEventDetail } from "@/lib/claim-event";
import { centsToDollarString, formatCents, parseDollarsToCents } from "@/lib/money";
import { bidValidationMessage, validateTargetBid, type RankingPricing } from "@/lib/ranking";
import { normalizeWebsite } from "@/lib/url";

type Props = {
  claimTopCents: number;
  currentTopCents: number;
  leaderName: string | null;
  pricing: RankingPricing;
  paymentsEnabled: boolean;
  initialAmountCents?: number | null;
  timeframe?: "all-time" | "today";
};

type KnownListing = {
  id: string;
  name: string;
  slug: string;
  category: CategorySlug;
  standingBidCents: number;
  overallRank: number;
  categoryRank: number;
};

type LookupState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "new" }
  | { status: "known"; listing: KnownListing; claimTopCents: number };

/** The whole purchase in one centered block: the price, then one row of fields. */
export function BidPanel({
  claimTopCents,
  currentTopCents,
  leaderName,
  pricing,
  paymentsEnabled,
  initialAmountCents = null,
  timeframe = "all-time",
}: Props) {
  const [amount, setAmount] = useState(() =>
    centsToDollarString(initialAmountCents && initialAmountCents > 0 ? initialAmountCents : claimTopCents),
  );
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [category, setCategory] = useState<CategorySlug | "">("");
  const [lookup, setLookup] = useState<LookupState>({ status: "idle" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<string | null>(null);

  const amountRef = useRef<HTMLInputElement>(null);
  const lookupSeq = useRef(0);

  const known = lookup.status === "known" ? lookup.listing : null;
  const currentStandingBidCents = known?.standingBidCents ?? 0;
  const amountCents = parseDollarsToCents(amount);
  const topExcludingSelf =
    lookup.status === "known"
      ? Math.max(0, lookup.claimTopCents - pricing.topPositionIncrementCents)
      : currentTopCents;

  useEffect(() => {
    function onClaim(event: Event) {
      const detail = (event as CustomEvent<ClaimEventDetail>).detail;
      if (!detail) return;
      setAmount(centsToDollarString(detail.targetCents));
      setError(null);
      setErrorField(null);
      if (detail.displayWebsite) setWebsite(detail.displayWebsite);
      window.requestAnimationFrame(() => amountRef.current?.focus({ preventScroll: true }));
    }
    window.addEventListener(CLAIM_EVENT, onClaim);
    return () => window.removeEventListener(CLAIM_EVENT, onClaim);
  }, []);

  const runLookup = useCallback(
    async (value: string) => {
      if (!normalizeWebsite(value).ok) {
        setLookup({ status: "idle" });
        return;
      }
      const seq = ++lookupSeq.current;
      setLookup({ status: "checking" });
      try {
        const response = await fetch("/api/bid/lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ website: value }),
        });
        const data = await response.json();
        if (seq !== lookupSeq.current) return;

        if (data?.found && data.listing) {
          setLookup({
            status: "known",
            listing: data.listing as KnownListing,
            claimTopCents: data.claimTopCents ?? claimTopCents,
          });
          setAmount((prev) => {
            const prevCents = parseDollarsToCents(prev) ?? 0;
            const floor = data.listing.standingBidCents + pricing.standardIncrementCents;
            return prevCents > data.listing.standingBidCents
              ? prev
              : centsToDollarString(Math.max(floor, data.claimTopCents ?? floor));
          });
        } else {
          setLookup({ status: "new" });
        }
      } catch {
        if (seq === lookupSeq.current) setLookup({ status: "idle" });
      }
    },
    [claimTopCents, pricing.standardIncrementCents],
  );

  useEffect(() => {
    if (!website.trim()) return;
    const handle = setTimeout(() => void runLookup(website), 550);
    return () => clearTimeout(handle);
  }, [website, runLookup]);

  function onWebsiteChange(value: string) {
    setWebsite(value);
    setError(null);
    if (!value.trim()) {
      lookupSeq.current += 1;
      setLookup({ status: "idle" });
    }
  }

  const validation = useMemo(() => {
    if (amountCents === null) return null;
    return validateTargetBid({
      targetStandingBidCents: amountCents,
      currentStandingBidCents,
      currentTopCents,
      topExcludingSelfCents: topExcludingSelf,
      pricing,
    });
  }, [amountCents, currentStandingBidCents, currentTopCents, topExcludingSelf, pricing]);

  const chargeCents = validation?.ok ? validation.incrementCents : null;

  function step(direction: 1 | -1) {
    const base = amountCents ?? claimTopCents;
    const floor = known
      ? known.standingBidCents + pricing.standardIncrementCents
      : pricing.minNewBidCents;
    const next = base + direction * pricing.topPositionIncrementCents;
    setAmount(centsToDollarString(Math.min(pricing.maxBidCents, Math.max(floor, next))));
    setError(null);
  }

  function fail(message: string, field: string | null) {
    setError(message);
    setErrorField(field);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setErrorField(null);

    if (amountCents === null) return fail("Enter an amount.", "amount");
    if (validation && !validation.ok) {
      return fail(bidValidationMessage(validation.error, formatCents), "amount");
    }
    if (!normalizeWebsite(website).ok) return fail("Enter your website, like yourname.com.", "website");
    if (!known) {
      if (!name.trim()) return fail("Add your name.", "name");
      if (!category) return fail("Pick a category.", "category");
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/bid/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: known ? undefined : name,
          website,
          category: known ? undefined : category,
          amount,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data?.ok) {
        setSubmitting(false);
        return fail(data?.error ?? "Something went wrong. Try again.", data?.field ?? null);
      }
      window.location.assign(data.checkoutUrl as string);
    } catch {
      setSubmitting(false);
      fail("Could not reach checkout. Check your connection and try again.", null);
    }
  }

  const cta = (() => {
    if (!paymentsEnabled) return chargeCents === null ? "Claim" : `Claim · ${formatCents(chargeCents)}`;
    if (submitting) return "Opening…";
    if (chargeCents === null) return "Claim";
    return `Claim · ${formatCents(chargeCents)}`;
  })();

  const headline = timeframe === "today" ? "Claim today's #1 for" : "Claim #1 for";

  return (
    <section id="claim" className="scroll-mt-20 text-center">
      <form onSubmit={submit} noValidate>
        <h1 className="lift lift-1 display flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-[clamp(2.25rem,6.4vw,3.75rem)]">
          <span>{headline}</span>
          <span className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Lower the amount"
              className="grid h-8 w-8 place-items-center rounded-full bg-tint text-[18px] font-bold text-accent transition-colors hover:bg-accent hover:text-on-accent"
            >
              <span aria-hidden="true">−</span>
            </button>
            <span className="flex items-baseline text-accent">
              <span aria-hidden="true">$</span>
              <input
                ref={amountRef}
                id="claim-amount"
                name="amount"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError(null);
                }}
                aria-label="Your standing bid in dollars"
                aria-invalid={errorField === "amount"}
                className="tnum min-w-0 border-0 bg-transparent p-0 text-left outline-none"
                style={{ width: `${Math.max(1, amount.length) + 0.14}ch` }}
              />
            </span>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Raise the amount"
              className="grid h-8 w-8 place-items-center rounded-full bg-tint text-[18px] font-bold text-accent transition-colors hover:bg-accent hover:text-on-accent"
            >
              <span aria-hidden="true">+</span>
            </button>
          </span>
        </h1>

        <p className="lift lift-2 mx-auto mt-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[14.5px] text-ink-3">
          {known ? (
            <>
              <span className="font-semibold text-ink">{known.name}</span>
              <span aria-hidden="true">·</span>
              <span>#{known.overallRank}</span>
              <span aria-hidden="true">·</span>
              <span className="tnum">{formatCents(known.standingBidCents)}</span>
            </>
          ) : leaderName ? (
            <>
              <span className="font-semibold text-ink">{leaderName}</span>
              <span>holds it at</span>
              <span className="tnum font-semibold text-ink">{formatCents(currentTopCents)}</span>
              <span aria-hidden="true">·</span>
              <span>from <span className="tnum font-semibold text-accent">{formatCents(pricing.minNewBidCents)}</span></span>
            </>
          ) : (
            <span>
              Open from{" "}
              <span className="tnum font-semibold text-accent">
                {formatCents(pricing.minNewBidCents)}
              </span>
            </span>
          )}
        </p>

        {/* ---------- One row of fields. ---------- */}
        <div className="lift lift-2 mx-auto mt-7 max-w-[960px]">
          <div
            className={`grid gap-2.5 ${
              known ? "sm:grid-cols-[1fr_auto]" : "sm:grid-cols-[1fr_1fr_1fr_auto]"
            }`}
          >
            {known ? null : (
              <input
                id="claim-name"
                name="name"
                className="field"
                autoComplete="name"
                placeholder="Your name"
                aria-label="Your name"
                aria-invalid={errorField === "name"}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            )}

            <input
              id="claim-website"
              name="website"
              className="field"
              inputMode="url"
              autoComplete="url"
              placeholder="Your website"
              aria-label="Your website"
              aria-invalid={errorField === "website"}
              value={website}
              onChange={(e) => onWebsiteChange(e.target.value)}
            />

            {known ? null : (
              <select
                id="claim-category"
                name="category"
                className="field"
                aria-label="Category"
                aria-invalid={errorField === "category"}
                value={category}
                onChange={(e) => setCategory(e.target.value as CategorySlug)}
              >
                <option value="">Category</option>
                {CATEGORIES.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.label}
                  </option>
                ))}
              </select>
            )}

            <button
              type="submit"
              disabled={submitting || !paymentsEnabled}
              className="btn btn-primary px-7 py-3"
            >
              {cta}
            </button>
          </div>

          {known && chargeCents !== null && amountCents !== null ? (
            <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-tint px-4 py-1.5 text-[13.5px] text-ink-2">
              You pay
              <span className="tnum font-semibold text-accent">{formatCents(chargeCents)}</span>
              <span className="text-ink-3">· the difference only</span>
            </p>
          ) : null}

          {error ? (
            <p role="alert" className="mt-3 text-[13.5px] font-medium text-flag">
              {error}
            </p>
          ) : null}

          {!paymentsEnabled ? (
            <p className="meta mt-3">Checkout opens shortly — the board is live.</p>
          ) : lookup.status === "checking" ? (
            <p className="meta mt-3">Checking…</p>
          ) : null}
        </div>
      </form>
    </section>
  );
}
