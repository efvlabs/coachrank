import { describe, expect, it } from "vitest";

import { normalizeWebsite, prettyWebsite } from "@/lib/url";

function normalized(input: string): string | null {
  const result = normalizeWebsite(input);
  return result.ok ? result.value.normalized : null;
}

describe("website normalisation", () => {
  it("collapses scheme, www, trailing slash and tracking parameters to one identity", () => {
    const variants = [
      "https://example.com",
      "https://example.com/",
      "http://example.com",
      "https://www.example.com/",
      "example.com",
      "EXAMPLE.com",
      "https://example.com/?utm_source=x&utm_medium=y",
      "https://example.com/#about",
      "https://example.com/?fbclid=abc123",
      "https://example.com/?ref=producthunt",
      "  https://example.com/  ",
    ];

    const results = variants.map(normalized);
    expect(new Set(results).size).toBe(1);
    expect(results[0]).toBe("example.com");
  });

  it("keeps distinct meaningful paths distinct", () => {
    expect(normalized("https://example.com/sarah")).toBe("example.com/sarah");
    expect(normalized("https://example.com/alex")).toBe("example.com/alex");
    expect(normalized("https://example.com/sarah")).not.toBe(normalized("https://example.com/alex"));
    expect(normalized("https://example.com/sarah")).not.toBe(normalized("https://example.com"));
  });

  it("treats a path with and without a trailing slash as the same listing", () => {
    expect(normalized("https://example.com/coaching/")).toBe(normalized("https://example.com/coaching"));
  });

  it("keeps meaningful query parameters and orders them stably", () => {
    expect(normalized("https://example.com/p?b=2&a=1")).toBe(
      normalized("https://example.com/p?a=1&b=2"),
    );
    expect(normalized("https://example.com/p?id=7")).toBe("example.com/p?id=7");
    expect(normalized("https://example.com/p?id=7")).not.toBe(normalized("https://example.com/p?id=8"));
  });

  it("distinguishes subdomains", () => {
    expect(normalized("https://coach.example.com")).toBe("coach.example.com");
    expect(normalized("https://coach.example.com")).not.toBe(normalized("https://example.com"));
  });

  it("rejects dangerous schemes", () => {
    for (const bad of [
      "javascript:alert(1)",
      "JavaScript:alert(1)",
      "data:text/html;base64,PHNjcmlwdD4=",
      "vbscript:msgbox(1)",
      "file:///etc/passwd",
    ]) {
      const result = normalizeWebsite(bad);
      expect(result.ok, bad).toBe(false);
      if (!result.ok) expect(result.reason).toBe("unsupported_scheme");
    }
  });

  it("rejects link shorteners", () => {
    for (const short of ["bit.ly/abc", "https://t.co/xyz", "tinyurl.com/abc"]) {
      const result = normalizeWebsite(short);
      expect(result.ok, short).toBe(false);
      if (!result.ok) expect(result.reason).toBe("shortener");
    }
  });

  it("rejects non-public hosts and malformed input", () => {
    for (const bad of ["localhost", "http://localhost:3000", "192.168.0.1", "notadomain", ""]) {
      expect(normalizeWebsite(bad).ok, bad).toBe(false);
    }
  });

  it("produces an https display url and a readable label", () => {
    const result = normalizeWebsite("www.sarahchen.com/coaching/?utm_campaign=x");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.display).toBe("https://sarahchen.com/coaching");
      expect(result.value.host).toBe("sarahchen.com");
      expect(prettyWebsite(result.value.display)).toBe("sarahchen.com/coaching");
    }
  });
});
