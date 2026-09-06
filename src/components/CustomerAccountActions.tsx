"use client";

import { useState } from "react";

export function CustomerSignOut() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return <div><button className="tool-text-link" disabled={busy} onClick={async () => {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/account/session", { method: "DELETE" });
      if (!response.ok) throw new Error("Sign-out could not be completed. Please try again.");
      window.location.replace("/sign-in");
    } catch (error) { setError(error instanceof Error ? error.message : "Please try again."); setBusy(false); }
  }}>{busy ? "Signing out…" : "Sign Out"}</button>{error && <p role="alert" className="tool-error">{error}</p>}</div>;
}

export function ConnectPurchase({ saved = false }: { saved?: boolean }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function connect(useSavedLink: boolean) {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const body = useSavedLink ? { useSavedLink: true } : value.trim().startsWith("pay_") ? { receipt: value.trim() } : { access: value.trim() };
      const response = await fetch("/api/account/claim", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "We could not connect this purchase.");
      window.location.assign(data.url);
    } catch (error) { setError(error instanceof Error ? error.message : "Please try again."); setBusy(false); }
  }
  return <div className="account-connect">{saved && <div className="account-legacy-found"><strong>We found an earlier purchase in this browser.</strong><p>Connect it to the account shown above to keep your existing reports and open them on any device.</p><button className="tool-button" disabled={busy} onClick={() => connect(true)}>{busy ? "Connecting…" : "Connect my existing purchase →"}</button></div>}<details><summary>Missing an earlier purchase?</summary><p>Sign in with the email you used to buy it. Then paste your private access link or the payment ID from your Dodo receipt. You do not need to buy it again.</p><form onSubmit={event => { event.preventDefault(); void connect(false); }}><label htmlFor="connect-purchase">Private access link or Dodo payment ID</label><input id="connect-purchase" className="field" type="text" autoComplete="off" required maxLength={2000} placeholder="Your private link or pay_…" value={value} onChange={event => setValue(event.target.value)}/><button className="tool-button" disabled={busy}>{busy ? "Connecting…" : "Find and connect purchase →"}</button></form><p className="tool-tax-note">Need help? Email <a href="mailto:contact@coachrank.lol">contact@coachrank.lol</a> with your receipt. Never send card details.</p></details>{error && <p role="alert" className="tool-error">{error}</p>}</div>;
}
