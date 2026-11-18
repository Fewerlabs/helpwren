import { describe, expect, it } from "vitest";

import { accentStyle, readableOn } from "./accent";

describe("readableOn", () => {
  it("puts white text on a dark colour and dark text on a light one", () => {
    expect(readableOn("#3d6b57")).toBe("#ffffff");
    expect(readableOn("#1d4ed8")).toBe("#ffffff");
    expect(readableOn("#facc15")).toBe("#1c1a16");
    expect(readableOn("#ffffff")).toBe("#1c1a16");
  });
});

describe("accentStyle", () => {
  it("sets the colour and its text colour, or nothing when there is no colour", () => {
    expect(accentStyle("#facc15")).toEqual({
      "--primary": "#facc15",
      "--primary-foreground": "#1c1a16",
      "--ring": "#facc15",
    });
    expect(accentStyle(undefined)).toBeUndefined();
  });
});
