"use client";

import Link from "next/link";
import { useState } from "react";
import { customerSignInUrl } from "@/lib/customer-links";

export function AssessmentCheckout({ enabled, email, ownedOrderId }: { enabled: boolean; email?: string | null; ownedOrderId?: string }) {
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function checkout() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/assessment/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ acceptedTerms: accepted }) });
      const data = await response.json();
      if (response.status === 401 && data.signInUrl) { window.location.assign(data.signInUrl); return; }
      if (!response.ok) throw new Error(data.error || "Checkout could not be opened.");
      window.location.assign(data.checkoutUrl);
    } catch (error) { setError(error instanceof Error ? error.message : "Please try again."); setBusy(false); }
  }
  return <div className="assessment-checkout" id="get-assessment">{ownedOrderId ? <><p className="journal-label">Already yours</p><h3>Your lifetime access is ready.</h3><p className="tool-tax-note">Signed in as {email}. There is nothing more to pay.</p><Link className="tool-button" href={`/tools/brand-clarity/assessment?order=${ownedOrderId}`}>Open your assessment ↗</Link><Link className="tool-text-link" href="/my-tools">Go to My tools</Link></> : <><p className="tool-price">$9 <span>USD · lifetime access</span></p><p className="tool-tax-note">Applicable tax, if any, is shown at checkout. No subscription.</p>{email ? <><div className="checkout-account"><span>Save this purchase to</span><strong>{email}</strong><Link href="/my-tools">Switch account</Link></div><label className="tool-consent"><input type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} /> <span>I agree to the <Link href="/terms#assessments">assessment terms</Link> and understand how my answers are saved in the <Link href="/privacy">privacy policy</Link>.</span></label><button type="button" onClick={checkout} disabled={!enabled || !accepted || busy} className="tool-button">{busy ? "Opening secure checkout…" : enabled ? "Get lifetime access ↗" : "Checkout opens shortly"}</button></> : <><p className="checkout-account-note">Sign in with Google or an email link first. Your purchase, progress and reports will be waiting in My tools whenever you return.</p>{enabled ? <Link className="tool-button" href={customerSignInUrl("/tools/brand-clarity#get-assessment")}>Sign in to get lifetime access ↗</Link> : <p>Checkout opens shortly.</p>}<p className="tool-tax-note">Sign in → Secure checkout → Your assessment</p></>}{error ? <p role="alert" className="tool-error">{error}</p> : null}<p className="tool-tax-note">Secure checkout by Dodo Payments. Your assessment opens after payment is verified.</p><Link href="/my-tools" className="tool-text-link">Already purchased? Open My tools ↗</Link></>}</div>;
}
