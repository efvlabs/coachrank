"use client";

import { AdminIcon } from "./AdminIcon";

type Props = {
  icon: "edit" | "hide" | "restore" | "trash";
  label: string;
  /** Destructive actions ask once, because a mis-click here removes a coach. */
  confirm?: string;
  danger?: boolean;
};

export function IconButton({ icon, label, confirm, danger = false }: Props) {
  return (
    <button
      type="submit"
      title={label}
      aria-label={label}
      onClick={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault();
      }}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full border border-line transition-colors ${
        danger
          ? "text-ink-3 hover:border-flag hover:text-flag"
          : "text-ink-3 hover:border-line-2 hover:text-ink"
      }`}
    >
      <AdminIcon name={icon} />
    </button>
  );
}
