import { SITE } from "@/lib/config";

type Props = {
  title: string;
  updated: string;
  intro: React.ReactNode;
  children: React.ReactNode;
};

/** The shared shell for rules, terms and privacy. */
export function LegalPage({ title, updated, intro, children }: Props) {
  return (
    <div className="mx-auto max-w-[1180px] px-5 py-14 sm:px-8">
      <header className="pb-8">
        <h1 className="display text-[clamp(2.5rem,8vw,4.5rem)] leading-none">{title}</h1>
        <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.1em] text-ink-3">
          Last updated {updated}
        </p>
        <div className="prose-doc mt-6">{intro}</div>
      </header>

      <div className="prose-doc mt-9">{children}</div>

      <p className="meta mt-14">
        Questions about this page:{" "}
        <a href={`mailto:${SITE.contactEmail}`} className="text-accent hover:underline">
          {SITE.contactEmail}
        </a>
      </p>
    </div>
  );
}

/** Marks a detail the operator must fill in before launch. */
export function Fill({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-tint px-1 font-mono text-[0.85em] text-accent">[{children}]</span>
  );
}
