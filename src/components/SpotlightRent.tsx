"use client";

import { useEffect, useRef, useState } from "react";

import { TermsConsent } from "./TermsConsent";
import { formatCents } from "@/lib/money";
import type { SpotlightSlot } from "@/lib/domain/types";

type Props = { slot: SpotlightSlot; priceCents: number; label: string };

type Found = {
  id: string;
  name: string;
  category: string;
  bio: string;
  displayWebsite: string;
  standingBidCents: number;
};

/**
 * Only a coach already on the board can take a slot, so the flow is:
 * enter website → confirm the listing we found → Dodo checkout.
 */
export function SpotlightRent({ slot, priceCents, label }: Props) {
  const [open, setOpen] = useState(false);
  const [website, setWebsite] = useState("");
  const [found, setFound] = useState<Found | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const [acceptedTerms, setAcceptedTerms] = useState(false);

  async function findListing(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const response = await fetch("/api/spotlight/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ website }),
      });
      const data = await response.json();
      if (data?.found) setFound(data.listing as Found);
      else setError("That website is not on the board. Claim a rank first.");
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function checkout() {
    setError(null);
    if (!acceptedTerms) {
      setError("Tick the box to confirm you agree to the Rules and Terms.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/spotlight/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ website, slot, acceptedTerms }),
      });
      const data = await response.json();
      if (!response.ok || !data?.ok) {
        setError(data?.error ?? "Could not start checkout.");
        setBusy(false);
        return;
      }
      window.location.assign(data.checkoutUrl as string);
    } catch {
      setError("Could not reach checkout. Try again.");
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn btn-primary w-full px-4 py-2.5">
        Rent this slot
      </button>

      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === dialogRef.current) setOpen(false);
        }}
        className="w-[min(26rem,calc(100vw-2rem))] border border-ink bg-paper p-0 text-ink backdrop:bg-ink/50"
      >
        <div className="p-6">
          <div className="flex items-baseline justify-between gap-4 border-b border-line pb-3">
            <h2 className="eyebrow text-ink">{label}</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="eyebrow hover:text-ink"
            >
              Close
            </button>
          </div>

          <p className="display tnum mt-5 text-[40px] leading-none text-accent">
            {formatCents(priceCents)}
          </p>
          <p className="eyebrow mt-2">for 24 hours · changes no ranks</p>

          {!found ? (
            <form onSubmit={findListing} className="mt-6">
              <label className="block">
                <span className="eyebrow">The website you are listed with</span>
                <input
                  className="field mt-1"
                  placeholder="yourname.com"
                  inputMode="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  required
                />
              </label>
              {error ? (
                <p role="alert" className="meta mt-3 text-flag">
                  {error}
                </p>
              ) : null}
              <button type="submit" disabled={busy} className="btn btn-quiet mt-5 w-full px-4 py-2.5">
                {busy ? "Looking" : "Find my listing"}
              </button>
            </form>
          ) : (
            <div className="mt-6">
              <div className="pt-3">
                <p className="display text-[22px] leading-none">{found.name}</p>
                <p className="meta mt-2">{found.displayWebsite}</p>
                <p className="mt-3 text-[14px] leading-[1.5] text-ink-2">{found.bio}</p>
              </div>

              {error ? (
                <p role="alert" className="meta mt-3 text-flag">
                  {error}
                </p>
              ) : null}

              <div className="mt-5">
                <TermsConsent
                  id="accept-terms-spotlight"
                  checked={acceptedTerms}
                  onChange={(next) => {
                    setAcceptedTerms(next);
                    if (next) setError(null);
                  }}
                />
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFound(null);
                    setError(null);
                  }}
                  className="btn btn-quiet flex-1 px-4 py-2.5"
                >
                  Not me
                </button>
                <button
                  type="button"
                  onClick={checkout}
                  disabled={busy}
                  className="btn btn-primary flex-[2] px-4 py-2.5"
                >
                  {busy ? "Opening" : `Rent · ${formatCents(priceCents)}`}
                </button>
              </div>
              <p className="eyebrow mt-3 leading-[1.5]">
                The slot starts when payment is verified and runs exactly 24 hours.
              </p>
            </div>
          )}
        </div>
      </dialog>
    </>
  );
}
