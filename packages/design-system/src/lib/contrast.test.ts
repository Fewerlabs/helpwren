import { describe, expect, it } from "vitest";

import { contrastRatio, relativeLuminance } from "./contrast";

describe("contrastRatio", () => {
  it("is 21 for black on white and 1 for a colour on itself", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#3d6b57", "#3d6b57")).toBe(1);
  });

  it("does not depend on argument order", () => {
    expect(contrastRatio("#26231e", "#f7f4ed")).toBe(contrastRatio("#f7f4ed", "#26231e"));
  });

  it("matches the ratio published on the brand board for ink on paper", () => {
    expect(contrastRatio("#26231E", "#F7F4ED")).toBeGreaterThan(14);
  });
});

describe("relativeLuminance", () => {
  it("rejects anything that is not #rrggbb", () => {
    expect(() => relativeLuminance("#fff")).toThrow(/#rrggbb/);
    expect(() => relativeLuminance("rgb(0 0 0)")).toThrow(/#rrggbb/);
  });
});
