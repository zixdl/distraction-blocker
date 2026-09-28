import { describe, expect, it } from "vitest";
import {
  formatRemainingTime,
  getRemainingSeconds,
  validateDurationMinutes,
} from "./time";

describe("duration validation", () => {
  it("accepts the supported range", () => {
    expect(validateDurationMinutes(1)).toBe(1);
    expect(validateDurationMinutes(1440)).toBe(1440);
  });

  it("rejects fractions and values outside the supported range", () => {
    expect(() => validateDurationMinutes(0)).toThrow();
    expect(() => validateDurationMinutes(25.5)).toThrow();
    expect(() => validateDurationMinutes(1441)).toThrow();
  });
});

describe("remaining time", () => {
  it("rounds a partial remaining second up", () => {
    expect(getRemainingSeconds(10_001, 10_000)).toBe(1);
  });

  it("never returns a negative value", () => {
    expect(getRemainingSeconds(9_000, 10_000)).toBe(0);
  });

  it("formats minute and hour durations", () => {
    expect(formatRemainingTime(65)).toBe("01:05");
    expect(formatRemainingTime(3661)).toBe("01:01:01");
  });
});
