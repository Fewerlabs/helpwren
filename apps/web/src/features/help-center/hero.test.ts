import { parseSettings } from "@helpwren/core";
import { describe, expect, it } from "vitest";

import { heroStyle } from "./hero";

const settings = (brand: Record<string, unknown>, helpCenter: Record<string, unknown> = {}) =>
  parseSettings([
    { key: "brand", value: { name: "Acme", ...brand } },
    { key: "help_center", value: helpCenter },
  ]);

describe("heroStyle", () => {
  it("fills the band with the brand's colour, with words that can be read on it", () => {
    expect(heroStyle(settings({ accent: "#1d4ed8" })).style).toEqual({
      background: "#1d4ed8",
      color: "#ffffff",
    });
    expect(heroStyle(settings({ accent: "#f5d547" })).style.color).toBe("#1c1a16");
  });

  it("fades between two colours when the brand has a gradient", () => {
    const { style } = heroStyle(settings({ accent: "#0f766e", accentTo: "#38bdf8" }));
    expect(style.background).toBe("linear-gradient(135deg, #0f766e, #38bdf8)");
  });

  it("uses the theme's colour until the brand has one of its own", () => {
    expect(heroStyle(settings({}))).toEqual({
      plain: false,
      style: { background: "var(--primary)", color: "var(--primary-foreground)" },
    });
  });

  it("leaves the band the colour of the page when asked for plain", () => {
    expect(heroStyle(settings({ accent: "#1d4ed8" }, { headerStyle: "plain" }))).toEqual({
      plain: true,
      style: {},
    });
  });

  it("puts white words on a darkened picture", () => {
    const { style } = heroStyle(
      settings({}, { headerStyle: "image", headerImage: "https://cdn.example.com/a b.png" }),
    );
    expect(style.color).toBe("#ffffff");
    expect(style.backgroundImage).toContain('url("https://cdn.example.com/a b.png")');
  });

  it("falls back to the brand's colour when a picture was chosen and none is set", () => {
    expect(heroStyle(settings({ accent: "#1d4ed8" }, { headerStyle: "image" })).style).toEqual({
      background: "#1d4ed8",
      color: "#ffffff",
    });
  });
});
