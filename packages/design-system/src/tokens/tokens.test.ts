import { describe, expect, it } from "vitest";

import { parseTokens } from "./parse";
import { statusNames, themeOverrides, tokens } from "./tokens";
import css from "./tokens.css?raw";

const defined = new Set(Object.keys(parseTokens(css, "light")));
const referenced = (value: string) => /^var\(--([\w-]+)\)$/.exec(value)?.[1] ?? "";

describe("tokens", () => {
  it("only references colour variables that tokens.css defines", () => {
    const names = Object.values(tokens.color).map(referenced);
    expect(names.filter((name) => !defined.has(name))).toEqual([]);
  });

  it("references a defined text and surface variable for every status", () => {
    for (const status of statusNames) {
      expect(defined.has(referenced(tokens.status[status].text))).toBe(true);
      expect(defined.has(referenced(tokens.status[status].surface))).toBe(true);
    }
  });

  it("names override variables that tokens.css actually reads", () => {
    for (const name of [
      themeOverrides.accent,
      themeOverrides.accentForeground,
      themeOverrides.radius,
    ]) {
      expect(css).toContain(`var(${name},`);
    }
  });
});
