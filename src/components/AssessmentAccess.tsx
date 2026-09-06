"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function AssessmentAccess() {
  const [error, setError] = useState("");
  useEffect(() => {
    const access = window.location.hash.slice(1);
    const controller = new AbortController();
    fetch("/api/assessment/access", { method: "POST", signal: controller.signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ access }) }).then(async response => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Access could not be restored.");
      window.history.replaceState(null, "", window.location.pathname);
      window.location.replace("/tools/brand-clarity/assessment");
    }).catch(error => { if (!controller.signal.aborted) setError(error.message); });
    return () => controller.abort();
  }, []);
  return <div className="tool-state"><p className="journal-label">Your private assessment</p><h1>{error ? "Let’s restore your access." : "Opening your assessment…"}</h1><p role="status">{error || "Checking your private access link."}</p>{error ? <><p>Contact contact@coachrank.lol with your Dodo receipt if you need help.</p><Link href="/tools/brand-clarity" className="tool-text-link">Back to Brand Clarity ↗</Link></> : null}</div>;
}
