import { describe, expect, it } from "vitest";

import { parseEnv } from "./env";

const supabase = {
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
};

describe("parseEnv", () => {
  it("applies defaults when optional variables are missing", () => {
    expect(parseEnv(supabase)).toEqual({
      NODE_ENV: "development",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      ...supabase,
    });
  });

  it("accepts a valid app URL", () => {
    const env = parseEnv({ ...supabase, NEXT_PUBLIC_APP_URL: "https://support.example.com" });
    expect(env.NEXT_PUBLIC_APP_URL).toBe("https://support.example.com");
  });

  it("names the invalid variable in the error", () => {
    expect(() => parseEnv({ ...supabase, NEXT_PUBLIC_APP_URL: "not a url" })).toThrow(
      /NEXT_PUBLIC_APP_URL/,
    );
  });

  it("names the Supabase variables when they are missing", () => {
    expect(() => parseEnv({})).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
    expect(() => parseEnv({})).toThrow(/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  });
});
