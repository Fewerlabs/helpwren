import { describe, expect, it } from "vitest";

import { contrastRatio } from "../lib/contrast";
import { contrastPairs } from "./contrast-pairs";
import { parseTokens, type ThemeName } from "./parse";
import css from "./tokens.css?raw";

const themes: readonly ThemeName[] = ["light", "dark"];

describe.each(themes)("token contrast (%s)", (theme) => {
  const tokens = parseTokens(css, theme);

  it.each(contrastPairs)(
    "$foreground on $background is at least $minimum:1 ($use)",
    ({ foreground, background, minimum }) => {
      const foregroundValue = tokens[foreground];
      const backgroundValue = tokens[background];
      expect(foregroundValue, `--${foreground} is not defined`).toBeDefined();
      expect(backgroundValue, `--${background} is not defined`).toBeDefined();
      expect(contrastRatio(foregroundValue ?? "", backgroundValue ?? "")).toBeGreaterThanOrEqual(
        minimum,
      );
    },
  );
});

describe("token coverage", () => {
  it("checks every colour token in at least one pair", () => {
    const tokens = parseTokens(css, "light");
    const colourTokens = Object.entries(tokens)
      .filter(([, value]) => value.startsWith("#"))
      .map(([name]) => name);
    const checked = new Set(contrastPairs.flatMap((pair) => [pair.foreground, pair.background]));
    // Aliases and dividers: paper, card-surface, ink and wash are checked through their
    // semantic names; rule is for dividers only and carries no contrast requirement.
    const exempt = new Set(["paper", "card-surface", "ink", "wash", "rule"]);

    expect(colourTokens.filter((name) => !checked.has(name) && !exempt.has(name))).toEqual([]);
  });

  it("defines the same tokens in dark mode, with no undefined references", () => {
    expect(Object.keys(parseTokens(css, "dark"))).toEqual(Object.keys(parseTokens(css, "light")));
  });
});
