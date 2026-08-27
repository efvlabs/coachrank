import Link from "next/link";

type Props = { page: number; pageCount: number; basePath: string };

/** Explicit pages, never infinite scroll - the board stays fast and crawlable. */
export function Pagination({ page, pageCount, basePath }: Props) {
  if (pageCount <= 1) return null;

  const href = (n: number) => (n === 1 ? basePath : `${basePath}?page=${n}`);
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1).filter(
    (n) => n === 1 || n === pageCount || Math.abs(n - page) <= 1,
  );

  return (
    <nav aria-label="Pages" className="mt-8 flex items-center justify-center gap-2">
      {page > 1 ? (
        <Link href={href(page - 1)} rel="prev" className="btn btn-quiet px-4 py-1.5 text-[13px]">
          ← Prev
        </Link>
      ) : null}

      <span className="flex items-center gap-3">
        {pages.map((n, i) => (
          <span key={n} className="flex items-center gap-3">
            {pages[i - 1] !== undefined && n - pages[i - 1] > 1 ? (
              <span aria-hidden="true" className="px-1 text-ink-3">
                ···
              </span>
            ) : null}
            <Link
              href={href(n)}
              aria-current={n === page ? "page" : undefined}
              className={`tnum grid h-8 min-w-8 place-items-center rounded-full px-2 text-[13px] font-semibold transition-colors ${
                n === page ? "bg-accent text-on-accent" : "text-ink-2 hover:bg-tint hover:text-ink"
              }`}
            >
              {n}
            </Link>
          </span>
        ))}
      </span>

      {page < pageCount ? (
        <Link href={href(page + 1)} rel="next" className="btn btn-quiet px-4 py-1.5 text-[13px]">
          Next →
        </Link>
      ) : null}
    </nav>
  );
}
