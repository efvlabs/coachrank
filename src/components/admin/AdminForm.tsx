"use client";

import { useActionState } from "react";

import type { ActionResult } from "@/lib/domain/admin-actions";

type Props = {
  action: (formData: FormData) => Promise<ActionResult>;
  children: React.ReactNode;
  className?: string;
};

/** Wraps a server action and surfaces its result inline. */
export function AdminForm({ action, children, className = "" }: Props) {
  const [state, formAction, pending] = useActionState(
    async (_prev: ActionResult | null, formData: FormData) => action(formData),
    null,
  );

  return (
    <form action={formAction} className={className}>
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
      {pending ? (
        <p className="mt-3 text-[13px] text-ink-3" role="status">
          Saving…
        </p>
      ) : state ? (
        <p role="status"
          className={`mt-3 text-[13px] font-medium ${state.ok ? "text-accent" : "text-accent"}`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
