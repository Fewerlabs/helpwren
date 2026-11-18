import { describe, expect, it } from "vitest";

import { cn } from "./cn";

describe("cn", () => {
  it("joins truthy class names and drops falsy ones", () => {
    expect(cn("a", false, undefined, null, "b", { c: true, d: false })).toBe("a b c");
  });

  it("lets a later Tailwind utility override an earlier conflicting one", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });

  it("treats text-2xs as a font size, so it does not replace a text colour", () => {
    expect(cn("text-pencil", "text-2xs")).toBe("text-pencil text-2xs");
    expect(cn("text-sm", "text-2xs")).toBe("text-2xs");
  });

  it("treats border-line as a border width, so it does not replace a border colour", () => {
    expect(cn("border-border", "border-line")).toBe("border-border border-line");
    expect(cn("border-2", "border-line")).toBe("border-line");
  });
});
