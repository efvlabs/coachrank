"use client";

import Link from "next/link";

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Marks the box when the buyer tried to pay without ticking it. */
  invalid?: boolean;
  id?: string;
  className?: string;
};

/**
 * The affirmation that has to happen before money moves. Both purchase flows use this one
 * component so the wording a buyer agreed to is the same everywhere, and it names the two
 * consequences that actually surprise people: the payment is final, and reversing it gives
 * up what it bought.
 */
export function TermsConsent({
  checked,
  onChange,
  invalid = false,
  id = "accept-terms",
  className = "",
}: Props) {
  return (
    <label
      htmlFor={id}
      className={`inline-flex max-w-[48ch] cursor-pointer items-start gap-2.5 text-left text-[12.5px] leading-relaxed ${
        invalid ? "text-flag" : "text-ink-3"
      } ${className}`}
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
        I agree to the{" "}
        <Link href="/rules" className="underline underline-offset-2 hover:text-ink">
          Rules
        </Link>{" "}
        and{" "}
        <Link href="/terms" className="underline underline-offset-2 hover:text-ink">
          Terms
        </Link>
        . Payments are final and not refundable, and a reversed payment gives up what it bought.
      </span>
    </label>
  );
}
