import { contrastRatio } from "@helpwren/design-system";
import { describe, expect, it } from "vitest";

import { brandProps, readableOn } from "./accent";

describe("readableOn", () => {
  it("puts white text on a dark colour and dark text on a light one", () => {
    expect(readableOn("#3d6b57")).toBe("#ffffff");
    expect(readableOn("#1d4ed8")).toBe("#ffffff");
    expect(readableOn("#facc15")).toBe("#101a15");
    expect(readableOn("#ffffff")).toBe("#101a15");
    // A bright mid-tone reads better in white, though WCAG's ratio alone would pick dark...
    expect(readableOn("#f1635e")).toBe("#ffffff");
    // ...unless white falls under 3:1 on it.
    expect(readableOn("#f97316")).toBe("#101a15");
    expect(readableOn("#ffcb05")).toBe("#101a15");
  });
});

describe("brandProps", () => {
  it("is nothing when the brand has no colour, so Helpwren's own shows", () => {
    expect(brandProps({})).toBeUndefined();
  });

  it("fills buttons with the colour and keeps words in it readable in both themes", () => {
    const props = brandProps({ accent: "#f1635e" });
    expect(props?.["data-brand"]).toBe("");
    expect(props?.["data-brand-accent"]).toBe("");
    const style = props?.style as Record<string, string>;
    expect(style["--brand-button"]).toBe("#f1635e");
    expect(style["--brand-button-ink"]).toBe("#ffffff");
    expect(contrastRatio(style["--brand-text-light"] ?? "", "#ffffff")).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(style["--brand-text-dark"] ?? "", "#161616")).toBeGreaterThanOrEqual(4.5);
  });

  it("lightens a dark button colour for words on the dark theme", () => {
    const style = brandProps({ button: "#101a15" })?.style as Record<string, string>;
    expect(style["--brand-button"]).toBe("#101a15");
    expect(style["--brand-text-light"]).toBe("#101a15");
    expect(contrastRatio(style["--brand-text-dark"] ?? "", "#0c0c0d")).toBeGreaterThanOrEqual(4.5);
    expect(style["--brand"]).toBeUndefined();
  });

  it("fades large surfaces from the colour to its second colour", () => {
    const style = brandProps({ accent: "#1d4ed8", accentTo: "#38bdf8" })?.style as Record<
      string,
      string
    >;
    expect(style["--brand-fill"]).toBe("linear-gradient(135deg, #1d4ed8, #38bdf8)");
  });
});
