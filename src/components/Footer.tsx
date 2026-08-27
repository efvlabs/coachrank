import Link from "next/link";

import { Logo } from "./Logo";
import { CATEGORIES } from "@/lib/categories";
import { SITE } from "@/lib/config";

const YEAR = new Date().getFullYear();

export function Footer() {
  return (
    <footer className="mt-24 bg-tint">
      <div className="mx-auto max-w-[1180px] px-5 py-10 sm:px-8">
        <div className="grid gap-8 sm:grid-cols-[1.2fr_1.4fr_0.8fr]">
          <div>
            <p className="display flex items-center gap-2 text-[20px] leading-none">
              <Logo size={26} />
              CoachRank
            </p>
            <p className="mt-2 max-w-[34ch] text-[13.5px] leading-relaxed text-ink-3">
              {SITE.tagline}
            </p>
            <a
              href={`mailto:${SITE.contactEmail}`}
              className="meta mt-3 inline-block text-accent hover:underline"
            >
              {SITE.contactEmail}
            </a>
          </div>

          <nav aria-labelledby="ft-board">
            <h2 id="ft-board" className="eyebrow">
              Board
            </h2>
            <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5">
              <li>
                <Link href="/today" className="meta text-ink-2 hover:text-ink">
                  Today
                </Link>
              </li>
              {CATEGORIES.map((c) => (
                <li key={c.slug}>
                  <Link href={`/coaches/${c.slug}`} className="meta text-ink-2 hover:text-ink">
                    {c.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-labelledby="ft-info">
            <h2 id="ft-info" className="eyebrow">
              Information
            </h2>
            <ul className="mt-3 space-y-1.5">
              {[
                { href: "/rules", label: "Rules" },
                { href: "/about", label: "About" },
                { href: "/terms", label: "Terms" },
                { href: "/terms#refunds", label: "Refunds" },
                { href: "/privacy", label: "Privacy" },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="meta text-ink-2 hover:text-ink">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <p className="meta mt-10">© {YEAR} CoachRank</p>
      </div>
    </footer>
  );
}
