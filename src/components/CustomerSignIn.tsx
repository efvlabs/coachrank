"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { User } from "firebase/auth";
import { getCustomerAuth } from "@/lib/firebase/client";
import { customerReturnPath } from "@/lib/customer-links";

const EMAIL_KEY = "coachrank.signInEmail";
function authMessage(error: unknown) {
  const code = (error as { code?: string })?.code;
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return "Google sign-in was closed. Try again when you are ready, or use email below.";
  if (code === "auth/popup-blocked") return "Your browser blocked the Google window. Allow popups for CoachRank and try again, or use an email link below.";
  if (code === "auth/invalid-action-code" || code === "auth/expired-action-code" || code === "auth/invalid-credential") return "This link has expired, was already used, or does not match this email. Request a fresh link below.";
  if (code === "auth/account-exists-with-different-credential") return "Use an email link for the same address to open your existing account.";
  if (code === "auth/too-many-requests" || code === "auth/quota-exceeded") return "Email sign-in has reached a temporary sending limit. Try Google, or request another link later.";
  if (code === "auth/network-request-failed") return "We could not connect. Check your connection and try again.";
  if (code === "auth/invalid-email") return "Enter a valid email address.";
  if (code) return "Sign-in could not be completed. Try the other sign-in option, or contact contact@coachrank.lol.";
  return error instanceof Error ? error.message : "Please try signing in again.";
}

export function CustomerSignIn({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [ready, setReady] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const link = useRef("");
  const initialized = useRef(false);
  const verifiedUser = useRef<User | null>(null);
  const destination = customerReturnPath(next);

  async function establish(user: User) {
    verifiedUser.current = user;
    const response = await fetch("/api/account/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken: await user.getIdToken(true) }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not save your sign-in. Please try again.");
    try { localStorage.removeItem(EMAIL_KEY); } catch { /* Storage can be disabled. */ }
    const auth = await getCustomerAuth();
    if (auth) await (await import("firebase/auth")).signOut(auth).catch(() => {});
    // Remove the one-time code from history and perform a fresh, uncached account load.
    window.history.replaceState({}, "", "/sign-in");
    window.location.replace(destination);
  }

  async function completeEmail(address: string) {
    setBusy(true); setError("");
    try {
      if (verifiedUser.current) { await establish(verifiedUser.current); return; }
      const auth = await getCustomerAuth();
      if (!auth) throw new Error("Sign-in is temporarily unavailable.");
      const { signInWithEmailLink } = await import("firebase/auth");
      const result = await signInWithEmailLink(auth, address.trim(), link.current);
      await establish(result.user);
    } catch (error) { setError(authMessage(error)); setBusy(false); }
  }

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    void (async () => {
      try {
        const auth = await getCustomerAuth();
        if (!auth) throw new Error("Sign-in is temporarily unavailable.");
        const sdk = await import("firebase/auth");
        setReady(true);
        if (sdk.isSignInWithEmailLink(auth, window.location.href)) {
          link.current = window.location.href;
          setConfirming(true);
          let saved = "";
          try { saved = localStorage.getItem(EMAIL_KEY) || ""; } catch { /* Ask for email on this device. */ }
          if (saved) { setEmail(saved); await completeEmail(saved); }
        }
      } catch (error) { setError(authMessage(error)); }
    })();
    // This handles the one-time link once per page load, including React Strict Mode.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown(value => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function google() {
    setBusy(true); setError("");
    try {
      const auth = await getCustomerAuth();
      if (!auth) throw new Error("Sign-in is temporarily unavailable.");
      const { GoogleAuthProvider, signInWithPopup } = await import("firebase/auth");
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await establish((await signInWithPopup(auth, provider)).user);
    } catch (error) { setError(authMessage(error)); setBusy(false); }
  }

  async function sendEmail(event: React.FormEvent) {
    event.preventDefault();
    if (confirming) { await completeEmail(email); return; }
    if (cooldown || busy) return;
    setBusy(true); setError("");
    try {
      const auth = await getCustomerAuth();
      if (!auth) throw new Error("Sign-in is temporarily unavailable.");
      const { sendSignInLinkToEmail } = await import("firebase/auth");
      const url = new URL("/sign-in", window.location.origin);
      url.searchParams.set("next", destination);
      await sendSignInLinkToEmail(auth, email.trim(), { url: url.href, handleCodeInApp: true });
      try { localStorage.setItem(EMAIL_KEY, email.trim()); } catch { /* Email confirmation works without storage. */ }
      setSent(true); setCooldown(60);
    } catch (error) { setError(authMessage(error)); }
    finally { setBusy(false); }
  }

  return <div className="account-auth-card">
    <p className="journal-label">Your CoachRank account</p>
    <h2>{confirming ? "One last step." : sent ? "Check your inbox." : "Make yourself at home."}</h2>
    <p className="account-auth-intro">{confirming ? "Confirm the email address that received this link. This keeps your account yours, even on a new device." : sent ? `We sent a sign-in link to ${email.trim()}. Open the newest email to continue. Check spam if it has not arrived.` : "New here or coming back? Use Google or an email link. No password to create or remember."}</p>
    {!confirming && <><button type="button" className="account-google" disabled={busy || !ready} onClick={google}><svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6C44.4 38.02 46.98 31.85 46.98 24.55z"/><path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.15 1.45-4.92 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>Continue with Google</button><div className="account-auth-divider"><span>or use your email</span></div></>}
    <form onSubmit={sendEmail}>
      <label htmlFor="customer-email">{confirming ? "Email that received the link" : "Email address"}</label>
      <input id="customer-email" className="field" type="email" autoComplete="email" inputMode="email" required maxLength={254} value={email} disabled={busy} onChange={event => { setEmail(event.target.value); setSent(false); }} placeholder="you@example.com" />
      <button className="tool-button" disabled={busy || !ready || (!confirming && cooldown > 0)}>{busy ? "Just a moment…" : confirming ? "Confirm email and sign in →" : cooldown ? `Send again in ${cooldown}s` : sent ? "Send a fresh link →" : "Email me a sign-in link →"}</button>
    </form>
    {error && <p role="alert" className="tool-error">{error}</p>}
    {confirming && <button className="tool-text-link" disabled={busy} onClick={() => { window.history.replaceState({}, "", `/sign-in?next=${encodeURIComponent(destination)}`); link.current = ""; verifiedUser.current = null; setConfirming(false); setError(""); }}>Request a new link or use Google</button>}
    <p className="account-auth-footnote">Use the same email whenever you return. Your purchases and reports stay together.</p>
    <p className="account-auth-legal">By continuing, you agree to our <Link href="/terms">terms</Link> and <Link href="/privacy">privacy policy</Link>. Signing in does not make a purchase or subscribe you to marketing emails.</p>
  </div>;
}
