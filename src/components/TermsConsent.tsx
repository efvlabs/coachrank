"use client";

import Link from "next/link";

import { SITE } from "@/lib/config";

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Marks the box when the buyer tried to pay without ticking it. */
  invalid?: boolean;
  id?: string;
  className?: string;
};

/**
 * The affirmation that has to happen before money moves. It says one thing and links to
 * where the detail lives: promising "no refunds" and "a reversed payment gives up its
 * rank" in the same breath reads as a contradiction, and a consent box is the wrong place
 * to argue the difference.
 */
export function TermsConsent({
  checked,
  onChange,
  invalid = false,
  id = "accept-terms",
  className = "",
}: Props) {
  return (
    <div className={`max-w-[46ch] ${className}`}>
      <label
        htmlFor={id}
        className={`flex cursor-pointer items-start gap-2.5 rounded-2xl border px-3.5 py-3 text-left text-[13px] leading-relaxed transition-colors ${
          invalid ? "border-flag text-flag" : "border-line text-ink-2 hover:border-line-2"
        }`}
      >
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          aria-invalid={invalid || undefined}
          className="mt-[2px] h-[15px] w-[15px] shrink-0 cursor-pointer accent-accent"
        />
        <span>
          I have read and agree to the{" "}
          <Link href="/terms" className="text-accent underline underline-offset-2">
            Terms of Service
          </Link>{" "}
          of {SITE.name}
        </span>
      </label>

      <p className="mt-2 text-center text-[12px] text-ink-3">
        <Link href="/privacy" className="underline underline-offset-2 hover:text-ink">
          Privacy
        </Link>
        <span aria-hidden="true"> · </span>
        <Link href="/rules" className="underline underline-offset-2 hover:text-ink">
          Rules
        </Link>
      </p>
    </div>
  );
}
