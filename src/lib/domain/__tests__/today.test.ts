import { beforeEach, describe, expect, it, vi } from "vitest";

// Mocked at the module boundary `getTodayRecommendation` actually calls
// through -- no Supabase client, no network, deterministic. This is
// specifically here to verify the bounded retry added for the "occasional
// plan load failure" investigation (docs' app-boot notes): one transient
// failure must resolve via the retry, two must still surface as a real
// error, and it must never take more than the documented 2 attempts.
vi.mock("../sessions", () => ({
  getInProgressSession: vi.fn(),
}));
vi.mock("../plans", () => ({
  getActivePlan: vi.fn(),
  getNextPlanItem: vi.fn(),
}));

import { getTodayRecommendation } from "../today";
import { getActivePlan, getNextPlanItem } from "../plans";
import { getInProgressSession } from "../sessions";

const mockGetInProgressSession = vi.mocked(getInProgressSession);
const mockGetActivePlan = vi.mocked(getActivePlan);
const mockGetNextPlanItem = vi.mocked(getNextPlanItem);

describe("getTodayRecommendation retry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("recovers from a single transient failure on retry", async () => {
    mockGetInProgressSession.mockRejectedValueOnce(new Error("transient: connection reset"));
    mockGetInProgressSession.mockResolvedValueOnce(null);
    mockGetActivePlan.mockResolvedValue({ id: "plan-1", name: "Plan A" });
    mockGetNextPlanItem.mockResolvedValue({
      planItemId: "item-1",
      routineId: "routine-1",
      routineName: "Push",
      order: 1,
    });

    const result = await getTodayRecommendation("user-1");

    expect(result).toEqual({
      type: "ready",
      planId: "plan-1",
      planItemId: "item-1",
      routineId: "routine-1",
      routineName: "Push",
    });
    // Exactly one retry happened -- the read was attempted twice, not more.
    expect(mockGetInProgressSession).toHaveBeenCalledTimes(2);
  });

  it("still surfaces a real error after both attempts fail -- never hangs, never fakes no_plan", async () => {
    mockGetInProgressSession.mockRejectedValue(new Error("persistent: connection refused"));

    const result = await getTodayRecommendation("user-1");

    expect(result).toEqual({ type: "error", reason: "persistent: connection refused" });
    // Bounded: exactly 2 attempts total, never more (not a polling loop).
    expect(mockGetInProgressSession).toHaveBeenCalledTimes(2);
  });

  it("never retries on success -- the happy path costs exactly one read", async () => {
    mockGetInProgressSession.mockResolvedValue(null);
    mockGetActivePlan.mockResolvedValue(null);

    const result = await getTodayRecommendation("user-1");

    expect(result).toEqual({ type: "no_plan" });
    expect(mockGetInProgressSession).toHaveBeenCalledTimes(1);
  });
});
