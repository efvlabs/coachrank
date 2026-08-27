"use client";

import { useState } from "react";

import { Modal } from "./Modal";
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
 * is: enter the website → confirm the listing if we found one, otherwise say who the ad is
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
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    setOpen(false);
    setError(null);
  }

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
      if (!name.trim()) return setError("Add a name.");
      if (!category) return setError("Pick a category.");
    }
    if (!acceptedTerms) return setError("Tick the box to agree to the Terms of Service.");

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
      <button type="button" onClick={() => setOpen(true)} className="btn btn-primary w-full py-2.5">
        {label}
      </button>

      <Modal open={open} onClose={close} title="Rent this spot">
        <p className="display tnum mt-5 text-[40px] leading-none text-accent">
          {formatCents(priceCents)}
        </p>
        <p className="eyebrow mt-2">24 hours · Spotlight</p>

        {!found && !unlisted ? (
          <form onSubmit={findListing} className="mt-6">
            <label className="block">
              <span className="eyebrow">Website</span>
              <input
                className="field mt-1"
                placeholder="https://coachrank.lol"
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
              {busy ? "Checking" : "Continue"}
            </button>
          </form>
        ) : (
          <div className="mt-6">
            {found ? (
              <div>
                <p className="display text-[22px] leading-none">{found.name}</p>
                <p className="meta mt-2">{found.displayWebsite}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block">
                  <span className="eyebrow">Name</span>
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

            <div className="mt-5">
              <TermsConsent
                id="accept-terms-spotlight"
                className="max-w-none"
                checked={acceptedTerms}
                onChange={(next) => {
                  setAcceptedTerms(next);
                  if (next) setError(null);
                }}
              />
            </div>

            {error ? (
              <p role="alert" className="meta mt-3 text-flag">
                {error}
              </p>
            ) : null}

            <button
              type="button"
              onClick={checkout}
              disabled={busy}
              className="btn btn-primary mt-4 w-full px-4 py-2.5"
            >
              {busy ? "Opening" : `Rent · ${formatCents(priceCents)}`}
            </button>
          </div>
        )}
      </Modal>
    </>
  );
}
