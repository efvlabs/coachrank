"use client";

import { useEffect, useRef, useState } from "react";

import { TermsConsent } from "./TermsConsent";
import { CATEGORIES, type CategorySlug } from "@/lib/categories";
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
 * A Spotlight is an advertisement, not a rank, so it does not require a listing. The flow
 * is: enter website → confirm the listing if we found one, otherwise fill in who the ad is
 * for → Dodo checkout.
 */
export function SpotlightRent({ slot, priceCents, label }: Props) {
  const [open, setOpen] = useState(false);
  const [website, setWebsite] = useState("");
  const [found, setFound] = useState<Found | null>(null);
  /** Set when the website is not on the board and the advertiser fills in their own details. */
  const [unlisted, setUnlisted] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<CategorySlug | "">("");
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
      // Not being on the board is not a failure here - it just means we need the details.
      if (data?.found) setFound(data.listing as Found);
      else setUnlisted(true);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function checkout() {
    setError(null);
    if (unlisted) {
      if (!name.trim()) return setError("Add the name to show on the ad.");
      if (!category) return setError("Pick a category.");
    }
    if (!acceptedTerms) {
      setError("Tick the box to agree to the Terms of Service.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/spotlight/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          website,
          slot,
          acceptedTerms,
          name: unlisted ? name : undefined,
          category: unlisted ? category : undefined,
        }),
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

          {!found && !unlisted ? (
            <form onSubmit={findListing} className="mt-6">
              <label className="block">
                <span className="eyebrow">The website the ad links to</span>
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
              {found ? (
                <div className="pt-3">
                  <p className="display text-[22px] leading-none">{found.name}</p>
                  <p className="meta mt-2">{found.displayWebsite}</p>
                  <p className="mt-3 text-[14px] leading-[1.5] text-ink-2">{found.bio}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="meta">
                    Not on the board - that is fine, a Spotlight is an ad. Tell us who it is for.
                  </p>
                  <label className="block">
                    <span className="eyebrow">Name to show on the ad</span>
                    <input
                      className="field mt-1"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name or brand"
                      required
                    />
                  </label>
                  <label className="block">
                    <span className="eyebrow">Category</span>
                    <select
                      className="field mt-1"
                      value={category}
                      onChange={(e) => setCategory(e.target.value as CategorySlug)}
                      required
                    >
                      <option value="">Pick one</option>
                      {CATEGORIES.map((c) => (
                        <option key={c.slug} value={c.slug}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p className="meta">{website}</p>
                </div>
              )}

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
                    setUnlisted(false);
                    setError(null);
                  }}
                  className="btn btn-quiet flex-1 px-4 py-2.5"
                >
                  Back
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
