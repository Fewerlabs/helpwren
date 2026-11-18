import { describe, expect, it } from "vitest";

import { loginCodeSchema, loginEmailSchema } from "./auth";

describe("loginEmailSchema", () => {
  it("trims and lowercases, so one person has one spelling", () => {
    expect(loginEmailSchema.parse("  Ada@Example.COM ")).toBe("ada@example.com");
  });

  it("rejects text that is not an email address", () => {
    expect(loginEmailSchema.safeParse("ada").success).toBe(false);
  });
});

describe("loginCodeSchema", () => {
  it("accepts six digits, ignoring surrounding spaces", () => {
    expect(loginCodeSchema.parse(" 012345 ")).toBe("012345");
  });

  it.each(["12345", "1234567", "12a456", ""])("rejects %j", (code) => {
    expect(loginCodeSchema.safeParse(code).success).toBe(false);
  });
});
