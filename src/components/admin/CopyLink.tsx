"use client";

import { useState } from "react";

/** Hands the admin a coach's private edit link, ready to paste into a reply. */
export function CopyLink({ href, label }: { href: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(new URL(href, window.location.origin).toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="rounded-full border border-line px-3 py-1 text-[11.5px] font-semibold text-ink-3 transition-colors hover:border-line-2 hover:text-ink"
    >
      {copied ? "Copied" : label}
    </button>
  );
}
