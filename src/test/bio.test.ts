import { describe, expect, it } from "vitest";

import { MAX_BIO_CHARS, bioParagraphs, countWords, validateBio } from "@/lib/bio";

describe("a bio is plain text", () => {
  it("accepts a bio at the character limit", () => {
    expect(validateBio("a".repeat(MAX_BIO_CHARS)).ok).toBe(true);
  });

  it("rejects one character more", () => {
    const result = validateBio("a".repeat(MAX_BIO_CHARS + 1));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("too_long");
  });

  it("keeps paragraph breaks and collapses everything else", () => {
    const result = validateBio("I help   founders\tship.\n\n\n\nTwenty  years of it.");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe("I help founders ship.\n\nTwenty years of it.");
      expect(bioParagraphs(result.value)).toEqual([
        "I help founders ship.",
        "Twenty years of it.",
      ]);
    }
  });

  it("counts words the same way the live counter does", () => {
    expect(countWords("  I help   founders  ship  ")).toBe(4);
    expect(countWords("")).toBe(0);
    expect(countWords("\n\t")).toBe(0);
  });

  it("refuses anything that could become markup", () => {
    for (const bad of [
      "<script>alert(1)</script>",
      "I help founders <b>win</b>",
      "Coaching &amp; mentoring",
    ]) {
      const result = validateBio(bad);
      expect(result.ok, bad).toBe(false);
      if (!result.ok) expect(result.reason).toBe("markup");
    }
  });

  it("rejects an empty bio", () => {
    expect(validateBio("   ").ok).toBe(false);
    expect(validateBio(null).ok).toBe(false);
  });
});
