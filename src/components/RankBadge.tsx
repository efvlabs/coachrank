"use client";

import { useState } from "react";

type Props = {
  slug: string;
  siteUrl: string;
  categoryLabel: string;
};

type Theme = "dark" | "light";
type Scope = "overall" | "category";

/**
 * The reason a coach sends us traffic instead of only taking it.
 *
 * A rank is worth more when it is visible where their clients already are, so the badge
 * goes on their own site - and every one of them is a link back, which is the thing a new
 * domain needs most and cannot buy honestly.
 */
export function RankBadge({ slug, siteUrl, categoryLabel }: Props) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [scope, setScope] = useState<Scope>("overall");
  const [copied, setCopied] = useState(false);

  const query = `?theme=${theme}${scope === "category" ? "&scope=category" : ""}`;
  const badgeUrl = `${siteUrl}/badge/${slug}${query}`;
  const rankUrl = `${siteUrl}/r/${slug}`;
  const alt = scope === "category" ? `CoachRank rank in ${categoryLabel}` : "CoachRank rank";

  const snippet = `<a href="${rankUrl}" target="_blank" rel="noopener">
  <img src="${badgeUrl}" alt="${alt}" height="40">
</a>`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const toggle = (active: boolean) =>
    `rounded-full px-3 py-1 text-[12.5px] font-semibold transition-colors ${
      active ? "bg-accent text-on-accent" : "text-ink-3 hover:text-ink"
    }`;

  return (
    <section className="mt-10 border-t border-line pt-6">
      <h2 className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-3">
        Put this on your site
      </h2>
      <p className="mt-2 max-w-[54ch] text-[13.5px] leading-relaxed text-ink-2">
        A live badge that updates itself when your rank moves. It links back here, so anyone
        who sees it can check the number for themselves.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-full border border-line p-1">
          <button type="button" onClick={() => setTheme("dark")} className={toggle(theme === "dark")}>
            Dark
          </button>
          <button type="button" onClick={() => setTheme("light")} className={toggle(theme === "light")}>
            Light
          </button>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-line p-1">
          <button type="button" onClick={() => setScope("overall")} className={toggle(scope === "overall")}>
            Overall
          </button>
          <button type="button" onClick={() => setScope("category")} className={toggle(scope === "category")}>
            Category
          </button>
        </div>
      </div>

      <div
        className="mt-4 flex items-center justify-center rounded-2xl border border-line p-6"
        style={{ background: theme === "dark" ? "#12141a" : "#ffffff" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/badge/${slug}${query}`} alt={alt} height={40} className="h-10 w-auto" />
      </div>

      <pre className="mt-3 overflow-x-auto rounded-2xl border border-line bg-tint p-4 text-[12px] leading-relaxed text-ink-2">
        <code>{snippet}</code>
      </pre>

      <button type="button" onClick={copy} className="btn btn-quiet mt-3 px-4 py-1.5 text-[13px]">
        {copied ? "Copied" : "Copy the code"}
      </button>
      <span aria-live="polite" className="sr-only">
        {copied ? "Embed code copied" : ""}
      </span>
    </section>
  );
}
