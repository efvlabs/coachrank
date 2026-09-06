"use client";
import { useState } from "react";
export function AssessmentPreviewButton() {
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  return <div><button type="button" className="tool-button" disabled={busy} onClick={async () => { setBusy(true); setError(""); try { const response=await fetch("/api/admin/assessment-preview", {method:"POST"}); const data=await response.json(); if(!response.ok) throw new Error(data.error); window.location.assign(data.url); } catch(error) { setError(error instanceof Error ? error.message : "Could not open preview."); setBusy(false); } }}>{busy ? "Opening preview…" : "Open admin preview ↗"}</button>{error ? <p role="alert">{error}</p> : null}<p className="mt-2 text-sm text-ink-3">Opens or resumes your saved preview. Customer checkout stays separate. No payment or revenue is recorded.</p></div>;
}
