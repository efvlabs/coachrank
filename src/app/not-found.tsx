import Link from "next/link";

export const metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <div className="mx-auto max-w-[1180px] px-5 py-24 sm:px-8">
      <p className="eyebrow">404</p>
      <h1 className="display mt-5 max-w-[14ch] text-[clamp(2.5rem,8vw,4.5rem)] leading-[0.95]">
        Nothing on the board here.
      </h1>
      <p className="mt-5 max-w-[40ch] text-[15px] leading-[1.55] text-ink-2">
        This page does not exist, or a listing was removed.
      </p>
      <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3">
        <Link href="/" className="btn btn-primary px-7 py-3.5">
          The board
        </Link>
        <Link href="/categories" className="buy">
          Categories →
        </Link>
      </div>
    </div>
  );
}
