import { describe, expect, it } from "vitest";

import { MAX_BIO_WORDS, countWords, validateBio } from "@/lib/bio";

const words = (n: number) => Array.from({ length: n }, (_, i) => `word${i + 1}`).join(" ");

describe("30-word bio", () => {
  it("accepts exactly 30 words", () => {
    const result = validateBio(words(MAX_BIO_WORDS));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.words).toBe(30);
  });

  it("rejects 31 words", () => {
    const result = validateBio(words(MAX_BIO_WORDS + 1));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("too_many_words");
  });

  it("counts words the same way the live counter does", () => {
    expect(countWords("  I help   founders  ship  ")).toBe(4);
    expect(countWords("")).toBe(0);
    expect(countWords("\n\t")).toBe(0);
  });

  it("collapses whitespace so padding cannot smuggle in extra words", () => {
    const result = validateBio("I   help\n\nfounders\tship faster");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe("I help founders ship faster");
      expect(result.words).toBe(5);
    }
  });

  it("rejects anything containing markup", () => {
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
