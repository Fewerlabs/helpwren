import { describe, expect, it } from "vitest";

import { brandShades, fromOklch, inkOn, readableShade, themeSurfaces, toOklch } from "./colour";
import { contrastRatio } from "./contrast";

/** Brand colours across the wheel, from very light to very dark, including the awkward ones. */
const brands = [
  "#f1635e", // coral
  "#ffcb05", // yellow
  "#3d6b57", // moss
  "#1d4ed8", // blue
  "#101a15", // near-black
  "#ffffff", // white
  "#000000", // black
  "#22c55e", // bright green
  "#a855f7", // violet
  "#f97316", // orange
  "#06b6d4", // cyan
  "#e11d48", // rose
  "#6b7280", // grey
  "#fde68a", // pale yellow
];

describe("toOklch and fromOklch", () => {
  it("go there and back without changing the colour", () => {
    for (const hex of brands) expect(fromOklch(toOklch(hex))).toBe(hex);
  });
});

describe("readableShade", () => {
  it("keeps a colour that already reads", () => {
    expect(readableShade("#1d4ed8", ["#ffffff"])).toBe("#1d4ed8");
  });

  it("darkens on a light background and lightens on a dark one, keeping the hue", () => {
    const light = readableShade("#f1635e", ["#ffffff"]);
    const dark = readableShade("#101a15", ["#161616"]);
    expect(contrastRatio(light, "#ffffff")).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(dark, "#161616")).toBeGreaterThanOrEqual(4.5);
    expect(Math.abs(toOklch(light).h - toOklch("#f1635e").h)).toBeLessThan(6);
  });
});

describe("brandShades", () => {
  describe.each(["light", "dark"] as const)("in the %s theme", (theme) => {
    it.each(brands)("keeps %s readable", (brand) => {
      const shades = brandShades(brand)[theme];
      for (const surface of themeSurfaces[theme]) {
        expect(contrastRatio(shades.text, surface)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(shades.graphic, surface)).toBeGreaterThanOrEqual(3);
      }
      expect(contrastRatio(shades.text, shades.tint)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(shades.fillInk, shades.fill)).toBeGreaterThanOrEqual(3);
      expect(shades.fill).toBe(brand);
    });
  });

  it("puts white on coral and dark ink on yellow", () => {
    expect(inkOn("#f1635e")).toBe("#ffffff");
    expect(inkOn("#ffcb05")).toBe("#101a15");
  });
});
