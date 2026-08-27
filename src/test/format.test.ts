import { describe, expect, it } from "vitest";

import {
  formatRemaining,
  indefiniteArticle,
  initials,
  ordinal,
  relativeTime,
} from "@/lib/format";

const NOW = 1_700_000_000_000;
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe("relative time", () => {
  it("never produces a plural one", () => {
    expect(relativeTime(NOW - 95 * SECOND, NOW)).toBe("1 minute ago");
    expect(relativeTime(NOW - 61 * MINUTE, NOW)).toBe("1 hour ago");
    expect(relativeTime(NOW - 25 * HOUR, NOW)).toBe("1 day ago");
    expect(relativeTime(NOW - 31 * DAY, NOW)).toBe("1 month ago");
    expect(relativeTime(NOW - 400 * DAY, NOW)).toBe("1 year ago");
  });

  it("reads naturally across the scale", () => {
    expect(relativeTime(NOW, NOW)).toBe("just now");
    expect(relativeTime(NOW - 20 * SECOND, NOW)).toBe("just now");
    expect(relativeTime(NOW - 2 * MINUTE, NOW)).toBe("2 minutes ago");
    expect(relativeTime(NOW - 5 * HOUR, NOW)).toBe("5 hours ago");
    expect(relativeTime(NOW - 3 * DAY, NOW)).toBe("3 days ago");
  });

  it("does not go backwards for a future timestamp", () => {
    expect(relativeTime(NOW + 5 * MINUTE, NOW)).toBe("just now");
  });
});

describe("spotlight countdown", () => {
  it("formats hours, then minutes, then seconds", () => {
    expect(formatRemaining(6 * HOUR + 42 * MINUTE)).toBe("06h 42m left");
    expect(formatRemaining(42 * MINUTE + 7 * SECOND)).toBe("42m 07s left");
    expect(formatRemaining(9 * SECOND)).toBe("9s left");
    expect(formatRemaining(-1)).toBe("0s left");
  });

  it("covers the full 24-hour rental", () => {
    expect(formatRemaining(24 * HOUR)).toBe("24h 00m left");
  });
});

describe("initials", () => {
  it("uses first and last name", () => {
    expect(initials("Sarah Chen")).toBe("SC");
    expect(initials("Mia Lindqvist")).toBe("ML");
    expect(initials("Prince")).toBe("PR");
    expect(initials("  ")).toBe("?");
  });
});

describe("ordinal", () => {
  it("handles the teens", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23].map(ordinal)).toEqual([
      "1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "23rd",
    ]);
  });
});

describe("indefinite article", () => {
  it("picks by sound, not just the first letter", () => {
    expect(indefiniteArticle("Business")).toBe("a");
    expect(indefiniteArticle("Startup & Founder")).toBe("a");
    expect(indefiniteArticle("Executive & Leadership")).toBe("an");
    expect(indefiniteArticle("Life")).toBe("a");
    expect(indefiniteArticle("Sports")).toBe("a");
    expect(indefiniteArticle("university")).toBe("a");
    expect(indefiniteArticle("")).toBe("a");
  });
});
