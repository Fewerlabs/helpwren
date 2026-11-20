import { describe, expect, it } from "vitest";

import { accentStyle, readableOn } from "./accent";

describe("readableOn", () => {
  it("puts white text on a dark colour and dark text on a light one", () => {
    expect(readableOn("#3d6b57")).toBe("#ffffff");
    expect(readableOn("#1d4ed8")).toBe("#ffffff");
    expect(readableOn("#facc15")).toBe("#101a15");
    expect(readableOn("#ffffff")).toBe("#101a15");
    // Bright mid-tones read better in white, though WCAG's ratio would pick dark.
    expect(readableOn("#f1635e")).toBe("#ffffff");
    expect(readableOn("#f97316")).toBe("#ffffff");
    expect(readableOn("#ffcb05")).toBe("#101a15");
  });
});

describe("accentStyle", () => {
  it("sets the colour and its text colour, or nothing when there is no colour", () => {
    expect(accentStyle({ accent: "#facc15" })).toMatchObject({
      "--primary": "#facc15",
      "--primary-foreground": "#101a15",
      "--ring": "#facc15",
      "--moss": "#facc15",
      "--brand-fill": "#facc15",
    });
    expect(accentStyle({})).toBeUndefined();
  });

  it("gives buttons a colour of their own when the brand has one", () => {
    expect(accentStyle({ accent: "#1d4ed8", button: "#26231e" })).toMatchObject({
      "--primary": "#26231e",
      "--primary-foreground": "#ffffff",
      "--brand": "#1d4ed8",
    });
    expect(accentStyle({ button: "#26231e" })).toEqual({
      "--primary": "#26231e",
      "--primary-foreground": "#ffffff",
      "--primary-fill": "#26231e",
      "--primary-fill-foreground": "#ffffff",
      "--ring": "#26231e",
    });
  });

  it("fades large surfaces from the colour to its second colour", () => {
    expect(accentStyle({ accent: "#1d4ed8", accentTo: "#38bdf8" })).toMatchObject({
      "--primary": "#1d4ed8",
      "--brand-fill": "linear-gradient(135deg, #1d4ed8, #38bdf8)",
    });
  });
});
