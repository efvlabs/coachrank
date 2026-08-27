"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminSignOut() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    await fetch("/api/admin/session", { method: "DELETE" });
    router.push("/admin");
    // The layout reads the session cookie on the server, so it has to re-render.
    router.refresh();
  }

  return (
    <button type="button"
      onClick={signOut}
      disabled={busy}
      className="text-[12.5px] font-medium text-ink-3 hover:text-accent disabled:opacity-60"
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
