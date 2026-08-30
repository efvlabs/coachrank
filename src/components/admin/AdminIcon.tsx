type Name = "edit" | "hide" | "restore" | "trash" | "external";

const PATHS: Record<Name, React.ReactNode> = {
  edit: <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3z" />,
  hide: (
    <>
      <path d="M3 3l18 18" />
      <path d="M10.6 5.2A9.6 9.6 0 0 1 12 5c5 0 9 4.5 9 7a11 11 0 0 1-2.4 3.3" />
      <path d="M6.3 7.7A11.4 11.4 0 0 0 3 12c0 2.5 4 7 9 7a9.7 9.7 0 0 0 4-.85" />
      <path d="M9.9 10.1a3 3 0 0 0 4 4" />
    </>
  ),
  restore: (
    <>
      <path d="M3 12s3.6-7 9-7 9 7 9 7-3.6 7-9 7-9-7-9-7z" />
      <circle cx="12" cy="12" r="2.6" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M9.5 7V5.5A1.5 1.5 0 0 1 11 4h2a1.5 1.5 0 0 1 1.5 1.5V7" />
      <path d="M6.5 7l.8 12a1.6 1.6 0 0 0 1.6 1.5h6.2a1.6 1.6 0 0 0 1.6-1.5l.8-12" />
    </>
  ),
  external: (
    <>
      <path d="M14 4h6v6" />
      <path d="M20 4l-8.5 8.5" />
      <path d="M18 14v4.5A1.5 1.5 0 0 1 16.5 20h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10" />
    </>
  ),
};

/** One stroke weight, one size, so a row of controls reads as a row. */
export function AdminIcon({ name, className = "" }: { name: Name; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`h-[15px] w-[15px] ${className}`}
    >
      {PATHS[name]}
    </svg>
  );
}
