export type SocialName = "x" | "instagram" | "linkedin";

/**
 * The three brand marks, drawn rather than fetched so they cost no request and inherit
 * the surrounding colour. Instagram is a line drawing in its own identity, which is why
 * it is the one stroked mark here.
 */
export function SocialIcon({ name, size = 17 }: { name: SocialName; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    "aria-hidden": true as const,
    focusable: "false" as const,
  };

  if (name === "x") {
    return (
      <svg {...common} fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817-5.966 6.817H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644z" />
      </svg>
    );
  }

  if (name === "linkedin") {
    return (
      <svg {...common} fill="currentColor">
        <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3.2 9h3.55v11.8H3.2zm6 0h3.4v1.61h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.26 2.37 4.26 5.45v6.59h-3.54v-5.84c0-1.39-.02-3.18-1.94-3.18-1.94 0-2.24 1.52-2.24 3.08v5.94H9.2z" />
      </svg>
    );
  }

  return (
    <svg
      {...common}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="5.2" />
      <circle cx="12" cy="12" r="4.1" />
      <circle cx="17.3" cy="6.7" r="1.05" fill="currentColor" stroke="none" />
    </svg>
  );
}
