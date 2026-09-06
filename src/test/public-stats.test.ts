import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSiteStats: vi.fn(),
  getOnlineCount: vi.fn(),
  rateLimited: vi.fn(),
  config: { PRESENCE_ENABLED: true },
}));

vi.mock("@/lib/domain/stats", () => mocks);
vi.mock("@/lib/api", () => ({ rateLimited: mocks.rateLimited }));
vi.mock("@/lib/config", () => mocks.config);

import { GET } from "@/app/api/stats/route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.config.PRESENCE_ENABLED = true;
  mocks.rateLimited.mockReturnValue(false);
  mocks.getSiteStats.mockResolvedValue({
    visitors: 120,
    outboundClicks: 30,
    leaderboardRevenueCents: 1600,
    listedCoaches: 7,
    spotlightRevenueCents: 2900,
  });
  mocks.getOnlineCount.mockResolvedValue(2);
});

const request = () => new Request("https://coachrank.lol/api/stats");

describe("public activity", () => {
  it("returns measured public counters without exposing other accounting fields or caching presence", async () => {
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      stats: { visitors: 120, outboundClicks: 30, leaderboardRevenueCents: 1600 },
      onlineCount: 2,
    });
  });

  it("does not query or invent a presence count when presence is disabled", async () => {
    mocks.config.PRESENCE_ENABLED = false;
    const response = await GET(request());
    expect((await response.json()).onlineCount).toBeNull();
    expect(mocks.getOnlineCount).not.toHaveBeenCalled();
  });

  it("preserves an unavailable presence count instead of treating it as zero", async () => {
    mocks.getOnlineCount.mockResolvedValue(null);
    const response = await GET(request());
    expect((await response.json()).onlineCount).toBeNull();
  });

  it("rejects excessive refreshes before querying the database", async () => {
    mocks.rateLimited.mockReturnValue(true);
    const response = await GET(request());
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("60");
    expect(mocks.getSiteStats).not.toHaveBeenCalled();
    expect(mocks.getOnlineCount).not.toHaveBeenCalled();
  });
});
