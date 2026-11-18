import { describe, expect, it } from "vitest";

import { formatTimeAgo, isToday } from "./format-time";

const now = new Date("2026-11-18T15:00:00");
const ago = (milliseconds: number) => new Date(now.getTime() - milliseconds).toISOString();

describe("formatTimeAgo", () => {
  it.each([
    [30_000, "now"],
    [5 * 60_000, "5m ago"],
    [3 * 3_600_000, "3h ago"],
    [2 * 86_400_000, "2d ago"],
  ])("describes %i ms ago as %s", (elapsed, expected) => {
    expect(formatTimeAgo(ago(elapsed), now)).toBe(expected);
  });

  it("gives the date once a week has passed", () => {
    expect(formatTimeAgo(ago(10 * 86_400_000), now)).toMatch(/8/);
  });
});

describe("isToday", () => {
  it("is true earlier today and false yesterday", () => {
    expect(isToday(ago(3 * 3_600_000), now)).toBe(true);
    expect(isToday(ago(20 * 3_600_000), now)).toBe(false);
  });
});
