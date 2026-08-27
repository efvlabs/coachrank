/** "2 minutes ago" - deterministic, so server and client renders agree given the same clock. */
export function relativeTime(from: Date | number, now: Date | number = Date.now()): string {
  const then = from instanceof Date ? from.getTime() : from;
  const ref = now instanceof Date ? now.getTime() : now;
  const seconds = Math.max(0, Math.floor((ref - then) / 1000));

  if (seconds < 45) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes <= 1 ? "1 minute ago" : `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return days === 1 ? "1 day ago" : `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return months === 1 ? "1 month ago" : `${months} months ago`;
  const years = Math.floor(days / 365);
  return years === 1 ? "1 year ago" : `${years} years ago`;
}

/** `06h 42m left` for spotlight countdowns. Falls back to minutes/seconds near the end. */
export function formatRemaining(msRemaining: number): string {
  const ms = Math.max(0, msRemaining);
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m left`;
  if (minutes > 0) return `${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s left`;
  return `${seconds}s left`;
}

export function ordinal(n: number): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs >= 11 && abs <= 13) return `${n}th`;
  if (last === 1) return `${n}st`;
  if (last === 2) return `${n}nd`;
  if (last === 3) return `${n}rd`;
  return `${n}th`;
}

/** Initials for the fallback avatar: "Sarah Chen" -> "SC". */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** "a business coach" / "an executive coach" - decided by sound, not just the first letter. */
export function indefiniteArticle(word: string): "a" | "an" {
  const first = word.trim().toLowerCase();
  if (!first) return "a";
  // "a university", "a one-to-one" read correctly despite starting with a vowel letter.
  if (/^(uni|use|user|usual|eu|one)/.test(first)) return "a";
  return /^[aeiou]/.test(first) ? "an" : "a";
}
