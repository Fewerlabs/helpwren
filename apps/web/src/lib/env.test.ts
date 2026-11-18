import { describe, expect, it } from "vitest";

import { parseEnv } from "./env";

describe("parseEnv", () => {
  it("applies defaults when optional variables are missing", () => {
    expect(parseEnv({})).toEqual({
      NODE_ENV: "development",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    });
  });

  it("accepts a valid app URL", () => {
    const env = parseEnv({ NEXT_PUBLIC_APP_URL: "https://support.example.com" });
    expect(env.NEXT_PUBLIC_APP_URL).toBe("https://support.example.com");
  });

  it("names the invalid variable in the error", () => {
    expect(() => parseEnv({ NEXT_PUBLIC_APP_URL: "not a url" })).toThrow(/NEXT_PUBLIC_APP_URL/);
  });
});
