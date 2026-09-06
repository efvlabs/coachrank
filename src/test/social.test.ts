import { beforeEach, describe, expect, it, vi } from "vitest";
import launchRecords from "../../content/social-launch.json";

vi.mock("@/lib/firebase/admin", async () => { const { fakeDb } = await import("./fake-firestore"); return { requireDb: () => fakeDb }; });
vi.mock("@/lib/admin-auth", () => ({ getAdminUser: vi.fn() }));
vi.mock("@/lib/assessment-request", () => ({ sameOriginRequest: (request: Request) => request.headers.get("origin") === new URL(request.url).origin }));

import { getAdminUser } from "@/lib/admin-auth";
import { listSocialRecords, saveSocialRecord } from "@/lib/domain/social";
import { emptySocial, trackedSocialUrl, validateSocialInput } from "@/lib/social";
import { POST } from "@/app/api/admin/social/route";
import { fakeDb } from "./fake-firestore";

const draft = { ...emptySocial("post"), id: "test-draft", title: "A useful brand question", body: "Who is your offer for?", sourceUrl: "https://coachrank.lol/tools/brand-clarity" };
const request = (body: unknown, origin = "https://coachrank.lol") => new Request("https://coachrank.lol/api/admin/social", { method: "POST", headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify(body) });
beforeEach(() => { fakeDb.reset(); vi.mocked(getAdminUser).mockResolvedValue({ uid: "social-test-admin", email: "admin@example.com" }); });

describe("Social desk records", () => {
  it("requires real publication details and accepts a specific X post", () => {
    expect(() => validateSocialInput({ ...draft, status: "published" })).toThrow("live URL");
    const published = { ...draft, status: "published", completedDate: "2026-01-01", publicUrl: "https://x.com/coachrank/status/123456" };
    expect(validateSocialInput(published).status).toBe("published");
    expect(() => validateSocialInput({ ...published, publicUrl: "https://x.com/coachrank" })).toThrow("specific X post");
  });
  it("requires a profile and actual followed date to log a follow", () => {
    const account = { ...emptySocial("account"), id: "account", title: "A thoughtful coach" };
    expect(() => validateSocialInput(account)).toThrow("profile URL");
    expect(() => validateSocialInput({ ...account, publicUrl: "https://x.com/example", status: "following" })).toThrow("date you followed");
    expect(validateSocialInput({ ...account, publicUrl: "https://x.com/example" }).status).toBe("research");
  });
  it("rejects unsafe and wrong-platform links, malformed dates and unbounded text", () => {
    for (const sourceUrl of ["javascript:alert(1)", "http://coachrank.lol", "https://user:secret@coachrank.lol/"]) expect(() => validateSocialInput({ ...draft, sourceUrl })).toThrow("HTTPS");
    expect(() => validateSocialInput({ ...draft, publicUrl: "https://x.com.evil.example/post" })).toThrow("selected channel");
    for (const plannedDate of ["2026-02-30", "hello", "2026-9-06"]) expect(() => validateSocialInput({ ...draft, plannedDate })).toThrow("calendar date");
    expect(() => validateSocialInput({ ...draft, body: "x".repeat(12001) })).toThrow("too long");
    expect(() => validateSocialInput({ ...draft, completedDate: "2999-01-01" })).toThrow("future");
  });
  it("enforces the writing rule and kind-specific statuses", () => {
    expect(() => validateSocialInput({ ...draft, body: `One${String.fromCodePoint(0x2014)}two` })).toThrow("long dashes");
    expect(() => validateSocialInput({ ...draft, status: "following" })).toThrow("valid status");
    expect(() => validateSocialInput({ ...draft, status: "ready", body: "" })).toThrow("copy");
    expect(() => validateSocialInput({ ...draft, id: "../../settings" })).toThrow("record ID");
  });
  it("adds campaign tags only to CoachRank destinations and preserves other parameters", () => {
    const tagged = new URL(trackedSocialUrl("https://coachrank.lol/tools/brand-clarity?view=sample", "X"));
    expect(tagged.searchParams.get("utm_source")).toBe("x");
    expect(tagged.searchParams.get("view")).toBe("sample");
    expect(trackedSocialUrl("https://example.com/article", "X")).toBe("https://example.com/article");
  });
  it("preserves records when archived, restores them and rejects stale edits", async () => {
    const first = await saveSocialRecord(validateSocialInput(draft));
    expect(first.revision).toBe(1);
    const archived = await saveSocialRecord({ ...first, status: "archived" });
    expect(archived.createdAtMs).toBe(first.createdAtMs);
    await expect(saveSocialRecord({ ...first, body: "A stale change" })).rejects.toThrow("another tab");
    expect((await listSocialRecords())[0]).toMatchObject({ body: draft.body, status: "archived" });
    const restored = await saveSocialRecord({ ...archived, status: "draft" });
    expect(restored.revision).toBe(3);
    expect(restored.body).toBe(draft.body);
  });
  it("validates the complete launch pack without inventing published activity", () => {
    expect(new Set(launchRecords.map(record => record.id)).size).toBe(launchRecords.length);
    for (const raw of launchRecords) {
      const record = validateSocialInput(raw);
      expect(["draft", "research"]).toContain(record.status);
      expect(record.completedDate).toBe("");
      if (record.kind === "post" && record.channel === "X") expect(Array.from(record.body).length + 25).toBeLessThanOrEqual(280);
    }
  });
});

describe("Social desk API access", () => {
  it("blocks anonymous requests before any writes", async () => {
    vi.mocked(getAdminUser).mockResolvedValue(null);
    expect((await POST(request(draft))).status).toBe(403);
    expect(fakeDb.all("socialRecords")).toHaveLength(0);
  });
  it("blocks cross-origin writes even with an admin session", async () => {
    expect((await POST(request(draft, "https://unrelated.example"))).status).toBe(403);
    expect(fakeDb.all("socialRecords")).toHaveLength(0);
  });
  it("saves an authenticated record with no-store and returns conflicts", async () => {
    const first = await POST(request(draft));
    expect(first.status).toBe(200);
    expect(first.headers.get("cache-control")).toBe("no-store");
    expect((await first.json()).record.revision).toBe(1);
    expect((await POST(request(draft))).status).toBe(409);
  });
  it("returns a validation error without writing invalid data", async () => {
    expect((await POST(request({ ...draft, status: "published" }))).status).toBe(400);
    expect(fakeDb.all("socialRecords")).toHaveLength(0);
  });
});
