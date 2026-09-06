/** Only known CoachRank destinations can be used after sign-in. */
export function customerReturnPath(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\r\n]/.test(value)) return "/my-tools";
  try {
    const url = new URL(value, "https://coachrank.lol");
    if (url.origin !== "https://coachrank.lol" || !["/my-tools", "/tools/brand-clarity", "/tools/brand-clarity/assessment"].includes(url.pathname)) return "/my-tools";
    const order = url.searchParams.get("order");
    return url.pathname + (order && /^[a-f0-9]{32}$/.test(order) ? `?order=${order}` : "") + (url.hash === "#get-assessment" ? url.hash : "");
  } catch { return "/my-tools"; }
}

export function customerSignInUrl(next: string = "/my-tools") {
  return `/sign-in?next=${encodeURIComponent(customerReturnPath(next))}`;
}
