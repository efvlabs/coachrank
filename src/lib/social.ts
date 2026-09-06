export const SOCIAL_CHANNELS = ["X"] as const;
export type SocialChannel = typeof SOCIAL_CHANNELS[number];
export type SocialStatus = "draft" | "ready" | "published" | "research" | "following" | "archived";
export type SocialRecord = {
  id: string;
  kind: "post" | "account";
  title: string;
  channel: SocialChannel;
  status: SocialStatus;
  body: string;
  sourceUrl: string;
  publicUrl: string;
  plannedDate: string;
  completedDate: string;
  notes: string;
  revision: number;
  createdAtMs: number;
  updatedAtMs: number;
};
export type SocialInput = Omit<SocialRecord, "createdAtMs" | "updatedAtMs">;
export const SOCIAL_STATUSES = { post: ["draft", "ready", "published", "archived"], account: ["research", "following", "archived"] } as const;

export function emptySocial(kind: SocialRecord["kind"]): SocialInput {
  return { id: "", kind, title: "", channel: "X", status: kind === "post" ? "draft" : "research", body: "", sourceUrl: "", publicUrl: "", plannedDate: "", completedDate: "", notes: "", revision: 0 };
}

export function validSocialUrl(value: string, channel?: SocialChannel) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || !url.hostname.includes(".")) return false;
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (channel === "X") return host === "x.com" || host === "twitter.com";
    return true;
  } catch { return false; }
}

export function validateSocialInput(raw: unknown): SocialInput {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Add a complete record.");
  const value = raw as Record<string, unknown>;
  if (value.kind !== "post" && value.kind !== "account") throw new Error("Choose a post or an account.");
  const item = emptySocial(value.kind);
  const limits = { id: 80, title: 180, body: 12000, sourceUrl: 2000, publicUrl: 2000, plannedDate: 10, completedDate: 10, notes: 3000 };
  for (const [key, limit] of Object.entries(limits)) {
    if (typeof value[key] !== "string" || (value[key] as string).length > limit) throw new Error(`Check ${key}: the field is missing or too long.`);
    const text = (value[key] as string).trim();
    if (text.includes(String.fromCodePoint(0x2014))) throw new Error("Use periods, commas or colons instead of long dashes.");
    (item as unknown as Record<string, unknown>)[key] = text;
  }
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(item.id)) throw new Error("Invalid record ID.");
  if (!item.title) throw new Error("Give this record a title.");
  if (!SOCIAL_CHANNELS.includes(value.channel as SocialChannel)) throw new Error("Choose a channel.");
  item.channel = value.channel as SocialChannel;
  if (!(SOCIAL_STATUSES[item.kind] as readonly unknown[]).includes(value.status)) throw new Error("Choose a valid status.");
  item.status = value.status as SocialStatus;
  if (!Number.isSafeInteger(value.revision) || (value.revision as number) < 0) throw new Error("Invalid revision. Reload and try again.");
  item.revision = value.revision as number;
  for (const date of [item.plannedDate, item.completedDate]) {
    if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)) throw new Error("Choose a valid calendar date.");
  }
  if (item.completedDate && item.completedDate > new Date(Date.now() + 14 * 60 * 60 * 1000).toISOString().slice(0, 10)) throw new Error("The completed date cannot be in the future.");
  if (item.sourceUrl && !validSocialUrl(item.sourceUrl)) throw new Error("The source needs a full HTTPS link.");
  if (item.publicUrl && !validSocialUrl(item.publicUrl, item.channel)) throw new Error("Use an HTTPS profile or post link from the selected channel.");
  if (item.kind === "account" && (!item.publicUrl || !/^\/[A-Za-z0-9_]+\/?$/.test(new URL(item.publicUrl).pathname))) throw new Error("Add the account's profile URL.");
  if (item.status === "ready" && !item.body) throw new Error("Add the copy before marking this ready.");
  if (item.status === "published" && (!item.publicUrl || !item.completedDate || !item.body)) throw new Error("A published record needs copy, its live URL and the publication date.");
  if (item.kind === "post" && item.channel === "X" && item.status === "published" && !/^\/[A-Za-z0-9_]+\/status\/\d+\/?$/.test(new URL(item.publicUrl).pathname)) throw new Error("Add the specific X post URL, including /status/.");
  if (item.status === "following" && !item.completedDate) throw new Error("Add the date you followed this account.");
  return item;
}

export function trackedSocialUrl(source: string, channel: SocialChannel, campaign = "editorial_launch") {
  if (!source) return "";
  try {
    const url = new URL(source);
    if (url.protocol !== "https:" || url.hostname !== "coachrank.lol") return source;
    url.searchParams.set("utm_source", channel.toLowerCase());
    url.searchParams.set("utm_medium", "social");
    url.searchParams.set("utm_campaign", campaign);
    return url.toString();
  } catch { return ""; }
}
