"use client";

import Link from "next/link";
import { useState } from "react";

export function AssessmentCheckout({ enabled }: { enabled: boolean }) {
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function checkout() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/assessment/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ acceptedTerms: accepted }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Checkout could not be opened.");
      window.location.assign(data.checkoutUrl);
    } catch (error) { setError(error instanceof Error ? error.message : "Please try again."); setBusy(false); }
  }
  return <div className="assessment-checkout" id="get-assessment"><p className="tool-price">$9 <span>USD · one-time purchase</span></p><p className="tool-tax-note">Applicable tax, if any, is shown at checkout. No subscription.</p><label className="tool-consent"><input type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} /> <span>I agree to the <Link href="/terms#assessments">assessment terms</Link> and understand how my answers are saved in the <Link href="/privacy">privacy policy</Link>.</span></label><button type="button" onClick={checkout} disabled={!enabled || !accepted || busy} className="tool-button">{busy ? "Opening secure checkout…" : enabled ? "Get my Brand Clarity Assessment ↗" : "Checkout opens shortly"}</button>{error ? <p role="alert" className="tool-error">{error}</p> : null}<p className="tool-tax-note">Secure checkout by Dodo Payments. Your assessment opens after payment is verified.</p><Link href="/tools/brand-clarity/assessment" className="tool-text-link">Already purchased? Continue your assessment ↗</Link></div>;
}
