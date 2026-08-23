import { describe, expect, it } from "vitest";

import { formatRestClock, remainingRestSeconds, type RestRecord } from "../rest-timer";

/**
 * Pre-existing pure logic (Fase 1's rest timer), left completely
 * unmodified this phase -- adding coverage here, not changing behavior,
 * per this phase's own brief §28 ("rest timer" is explicitly one of the
 * things to test).
 */

describe("remainingRestSeconds", () => {
  it("counts down from the full duration to zero", () => {
    const record: RestRecord = { exerciseId: "ex-bench", startedAt: 0, durationSeconds: 90 };

    expect(remainingRestSeconds(record, 0)).toBe(90);
    expect(remainingRestSeconds(record, 60_000)).toBe(30);
    expect(remainingRestSeconds(record, 90_000)).toBe(0);
  });

  it("never goes negative once elapsed exceeds the duration", () => {
    const record: RestRecord = { exerciseId: "ex-bench", startedAt: 0, durationSeconds: 60 };
    expect(remainingRestSeconds(record, 120_000)).toBe(0);
  });

  it("derives from the real elapsed time, not from a decrement -- a late/skipped tick still lands on the correct value", () => {
    const record: RestRecord = { exerciseId: "ex-bench", startedAt: 0, durationSeconds: 90 };
    // Equivalent of "the tab was hidden for 45s" -- one read at the real
    // timestamp must show 45s remaining, matching real elapsed time.
    expect(remainingRestSeconds(record, 45_000)).toBe(45);
  });
});

describe("formatRestClock", () => {
  it("formats as m:ss, zero-padded", () => {
    expect(formatRestClock(90)).toBe("1:30");
    expect(formatRestClock(5)).toBe("0:05");
    expect(formatRestClock(0)).toBe("0:00");
    expect(formatRestClock(600)).toBe("10:00");
  });
});
