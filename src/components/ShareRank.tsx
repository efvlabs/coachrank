"use client";

import { useState } from "react";

type Props = {
  url: string;
  name: string;
  overallRank: number;
  categoryRank: number;
  categoryLabel: string;
};

/** The viral surface. Curiosity, never a quality claim. */
export function ShareRank({ url, name, overallRank, categoryRank, categoryLabel }: Props) {
  const [copied, setCopied] = useState(false);

  const text =
    overallRank === 1
      ? "I'm currently #1 on CoachRank.lol."
      : `I'm #${overallRank} on CoachRank.lol — #${categoryRank} in ${categoryLabel}.`;

  const links = [
    { label: "X", href: `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}` },
    { label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}` },
    { label: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}` },
  ];

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-5">
      <span className="mr-1 text-[11px] font-bold uppercase tracking-[0.1em] text-ink-3">Share</span>
      {links.map((l) => (
        <a
          key={l.label}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-quiet px-4 py-1.5 text-[13px]"
        >
          {l.label}
        </a>
      ))}
      <button type="button" onClick={copy} className="btn btn-quiet px-4 py-1.5 text-[13px]">
        {copied ? "Copied" : "Copy link"}
      </button>
      <span aria-live="polite" className="sr-only">
        {copied ? "Link copied" : ""}
      </span>
      <span className="sr-only">{name}</span>
    </div>
  );
}
