"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { getClientAuth, isClientFirebaseConfigured } from "@/lib/firebase/client";

/** Firebase email/password sign-in, exchanged server-side for an httpOnly session cookie. */
export function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!isClientFirebaseConfigured()) {
    return (
      <div className="card p-6">
        <h1 className="text-xl font-semibold tracking-tight">Admin unavailable</h1>
        <p className="mt-2 text-[14px] text-ink-3">
          Set the NEXT_PUBLIC_FIREBASE_* environment variables to enable admin sign-in.
        </p>
      </div>
    );
  }

  async function signIn(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    try {
      const auth = await getClientAuth();
      if (!auth) throw new Error("Auth unavailable");

      const { signInWithEmailAndPassword } = await import("firebase/auth");
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await credential.user.getIdToken(true);

      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const data = await response.json();

      if (!response.ok || !data?.ok) {
        setError(data?.error ?? "Could not sign in.");
        setBusy(false);
        return;
      }

      // The admin layout resolves the session server-side, so re-render it.
      router.refresh();
    } catch {
      setError("Wrong email or password.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={signIn} className="card p-6">
      <h1 className="text-xl font-semibold tracking-tight">CoachRank admin</h1>
      <p className="mt-1 text-[13px] text-ink-3">Restricted to configured administrators.</p>

      <label htmlFor="admin-email" className="mt-5 block text-[13px] font-medium">
        Email
      </label>
      <input id="admin-email" type="email"
        className="field mt-1.5"
        autoComplete="username"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <label htmlFor="admin-password" className="mt-3 block text-[13px] font-medium">
        Password
      </label>
      <input id="admin-password" type="password"
        className="field mt-1.5"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      {error ? (
        <p role="alert" className="mt-3 text-[13px] font-medium text-accent">
          {error}
        </p>
      ) : null}

      <button type="submit" disabled={busy} className="btn btn-primary mt-5 w-full px-5 py-2.5 text-[14px]">
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
