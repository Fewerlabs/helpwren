import { describe, expect, it } from "vitest";

import { formatBytes } from "./format-bytes";

describe("formatBytes", () => {
  it("picks the unit a person would use", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(812)).toBe("812 B");
    expect(formatBytes(34_816)).toBe("34 KB");
    expect(formatBytes(2_516_582)).toBe("2.4 MB");
    expect(formatBytes(10 * 1024 * 1024)).toBe("10 MB");
  });
});
