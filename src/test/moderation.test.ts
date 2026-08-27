import { describe, expect, it } from "vitest";

import { screenBio, screenWebsite, validateName } from "@/lib/moderation";

describe("website screening", () => {
  it("rejects adult and obviously blocked hosts", () => {
    expect(screenWebsite("pornhub.com")).toBe("blocked_site");
    expect(screenWebsite("cdn.xvideos.com")).toBe("blocked_site");
    expect(screenWebsite("bestpornsite.net")).toBe("blocked_site");
  });

  it("rejects social profiles standing in for a real website", () => {
    expect(screenWebsite("instagram.com")).toBe("not_own_site");
    expect(screenWebsite("linkedin.com")).toBe("not_own_site");
    expect(screenWebsite("docs.google.com")).toBe("not_own_site");
  });

  it("allows an ordinary coaching website", () => {
    expect(screenWebsite("sarahchen.com")).toBeNull();
    expect(screenWebsite("thefoundercoach.co.uk")).toBeNull();
  });
});

describe("bio screening", () => {
  it("rejects obvious spam", () => {
    expect(screenBio("Free crypto signals, click here")).toBe("spam_bio");
    expect(screenBio("Guaranteed returns for every client")).toBe("spam_bio");
    expect(screenBio("Visit https://example.com for more")).toBe("spam_bio");
  });

  it("rejects superlative claims, because the rank is paid", () => {
    for (const bio of [
      "The best business coach in London",
      "Top-rated executive coach for founders",
      "The world's leading leadership coach",
      "Most trusted coach for scaling teams",
      "The #1 startup coach in Europe",
    ]) {
      expect(screenBio(bio), bio).toBe("quality_claim");
    }
  });

  it("allows a plain factual bio", () => {
    expect(
      screenBio("I help founder-led companies install predictable sales systems without bloated teams."),
    ).toBeNull();
  });
});

describe("name validation", () => {
  it("accepts an ordinary name and trims whitespace", () => {
    const result = validateName("  Sarah   Chen ");
    expect(result).toEqual({ ok: true, value: "Sarah Chen" });
  });

  it("rejects empty, over-long and markup names", () => {
    expect(validateName("").ok).toBe(false);
    expect(validateName("a".repeat(61)).ok).toBe(false);
    expect(validateName("<script>x</script>").ok).toBe(false);
  });
});
