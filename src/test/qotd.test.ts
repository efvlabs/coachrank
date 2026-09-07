import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/firebase/admin", async () => { const { fakeDb } = await import("./fake-firestore"); return { requireDb: () => fakeDb }; });
vi.mock("@/lib/admin-auth", () => ({ getAdminUser: vi.fn() }));
vi.mock("@/lib/assessment-request", () => ({ sameOriginRequest: (request: Request) => request.headers.get("origin") === new URL(request.url).origin }));

import { getAdminUser } from "@/lib/admin-auth";
import { POST } from "@/app/api/admin/qotd/route";
import { listQotds, saveQotd } from "@/lib/domain/qotd";
import { emptyQotd, fitQuote, QOTD_EXAMPLE, qotdFilename, validateQotd, wrapQuote } from "@/lib/qotd";
import { fakeDb } from "./fake-firestore";

const draft = { ...emptyQotd("quote-test", "2026-09-07"), ...QOTD_EXAMPLE };
const request = (body: unknown, origin = "https://coachrank.lol") => new Request("https://coachrank.lol/api/admin/qotd", { method: "POST", headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify(body) });
const measure = (text: string, size: number) => Array.from(text).length * size * 0.55;
beforeEach(() => { fakeDb.reset(); vi.mocked(getAdminUser).mockResolvedValue({ uid: "qotd-test-admin", email: "admin@example.com" }); });

describe("QOTD layout and inputs", () => {
  it("keeps paragraphs and fits long words inside the artwork", () => {
    expect(wrapQuote("One thought.\n\nAnother thought.", 20, 500, measure)).toEqual(["One thought.", "", "Another thought."]);
    const lines = wrapQuote("Supercalifragilisticexpialidocious", 80, 300, measure);
    expect(lines.join("")).toBe("Supercalifragilisticexpialidocious");
    expect(lines.every(line => measure(line, 80) <= 300)).toBe(true);
  });
  it("keeps emoji graphemes intact when wrapping", () => {
    const lines = wrapQuote("👩🏽‍💻👩🏽‍💻", 20, 50, measure);
    expect(lines).toEqual(["👩🏽‍💻", "👩🏽‍💻"]);
  });
  it("reduces type size for longer quotes and never silently clips", () => {
    const short = fitQuote(draft.quote, measure);
    const long = fitQuote("A useful thought worth keeping. ".repeat(18), measure);
    expect(short.fits).toBe(true);
    expect(long.fits).toBe(true);
    expect(long.size).toBeLessThan(short.size);
    expect(long.lines.length * long.lineHeight).toBeLessThanOrEqual(790);
    expect(long.lines.every(line => measure(line, long.size) <= 936)).toBe(true);
    expect(fitQuote("word\n".repeat(50), measure).fits).toBe(false);
  });
  it("supports undated cards and treats quote content as plain text", () => {
    expect(validateQotd({ ...draft, quote: "  A thought.\r\nA second thought.  ", unexpected: "ignored" })).toEqual({ ...draft, quote: "A thought.\nA second thought." });
    expect(validateQotd({ ...draft, quote: "<b>Plain text</b>" }).quote).toBe("<b>Plain text</b>");
    expect(qotdFilename({ ...draft, author: "../../An Author?", date: "2026-09-07" })).toBe("coachrank-qotd-2026-09-07-an-author.png");
  });
  it("rejects invalid attribution, dates, long dashes and unsafe references", () => {
    expect(() => validateQotd({ ...draft, quote: " " })).toThrow("words");
    expect(() => validateQotd({ ...draft, quote: "x".repeat(701) })).toThrow("too long");
    expect(() => validateQotd({ ...draft, author: "" })).toThrow("name");
    expect(() => validateQotd({ ...draft, date: "2026-02-30" })).toThrow("calendar");
    expect(() => validateQotd({ ...draft, quote: `One${String.fromCodePoint(0x2014)}two` })).toThrow("long dashes");
    expect(() => validateQotd({ ...draft, sourceUrl: "javascript:alert(1)" })).toThrow("HTTPS");
    expect(() => validateQotd({ ...draft, id: "../../other" })).toThrow("quote ID");
  });
});

describe("QOTD storage and access", () => {
  it("requires an admin and same-origin request before writing", async () => {
    vi.mocked(getAdminUser).mockResolvedValue(null);
    expect((await POST(request(draft))).status).toBe(403);
    vi.mocked(getAdminUser).mockResolvedValue({ uid: "qotd-test-admin", email: "admin@example.com" });
    expect((await POST(request(draft, "https://other.example"))).status).toBe(403);
    expect(fakeDb.all("socialQuotes")).toHaveLength(0);
  });
  it("persists and reloads a quote, and refuses stale tabs", async () => {
    const response = await POST(request(draft));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    const saved = (await response.json()).record;
    expect((await listQotds())[0]).toMatchObject({ quote: draft.quote, revision: 1 });
    expect((await POST(request(draft))).status).toBe(409);
    const archived = await saveQotd({ ...saved, archived: true });
    expect(archived.createdAtMs).toBe(saved.createdAtMs);
    const restored = await saveQotd({ ...archived, archived: false });
    expect(restored).toMatchObject({ quote: draft.quote, revision: 3, archived: false });
    expect(fakeDb.all("socialRecords")).toHaveLength(0);
  });
  it("rejects malformed and oversized records without writes", async () => {
    expect((await POST(request({ ...draft, quote: "" }))).status).toBe(400);
    expect((await POST(request({ ...draft, quote: "x".repeat(10001) }))).status).toBe(413);
    expect(fakeDb.all("socialQuotes")).toHaveLength(0);
  });
});
