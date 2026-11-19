import { parseSettings } from "@helpwren/core";
import { describe, expect, it } from "vitest";

import { bannerStyle, heroKind } from "./hero";

const settings = (helpCenter: Record<string, unknown> = {}) =>
  parseSettings([{ key: "help_center", value: helpCenter }]);

describe("heroKind", () => {
  it("is a wash of the brand's colour unless told otherwise", () => {
    expect(heroKind(settings())).toBe("glow");
    expect(heroKind(settings({ headerStyle: "plain" }))).toBe("plain");
  });

  it("is a picture only when one is set", () => {
    const image = "https://cdn.example.com/a b.png";
    expect(heroKind(settings({ headerStyle: "image", headerImage: image }))).toBe("image");
    expect(heroKind(settings({ headerStyle: "image" }))).toBe("glow");
  });
});

describe("bannerStyle", () => {
  it("puts white words on a darkened picture, with its address quoted", () => {
    const style = bannerStyle("https://cdn.example.com/a b.png");
    expect(style.color).toBe("#ffffff");
    expect(style.backgroundImage).toContain('url("https://cdn.example.com/a b.png")');
  });
});
