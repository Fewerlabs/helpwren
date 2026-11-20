import { describe, expect, it } from "vitest";

import { contentSecurityPolicy } from "./security-headers";

const base = { supabaseUrl: "https://abc.supabase.co", appUrl: "https://help.example.com" };

function directive(policy: string, name: string) {
  return policy
    .split("; ")
    .find((part) => part.startsWith(`${name} `))
    ?.split(" ")
    .slice(1);
}

describe("contentSecurityPolicy", () => {
  it("lets pages talk to the app and its Supabase project, over HTTPS and sockets", () => {
    const policy = contentSecurityPolicy(base);
    expect(directive(policy, "connect-src")).toEqual([
      "'self'",
      "https://help.example.com",
      "https://abc.supabase.co",
      "wss://abc.supabase.co",
    ]);
  });

  it("allows no plugins, no other base address and no forms sent elsewhere", () => {
    const policy = contentSecurityPolicy(base);
    expect(directive(policy, "object-src")).toEqual(["'none'"]);
    expect(directive(policy, "base-uri")).toEqual(["'self'"]);
    expect(directive(policy, "form-action")).toEqual(["'self'"]);
  });

  it("lets only the app frame a page unless told otherwise", () => {
    expect(directive(contentSecurityPolicy(base), "frame-ancestors")).toEqual(["'self'"]);
    const listed = contentSecurityPolicy({ ...base, frameAncestors: ["https://shop.example"] });
    expect(directive(listed, "frame-ancestors")).toEqual(["'self'", "https://shop.example"]);
    expect(contentSecurityPolicy({ ...base, frameAncestors: "any" })).not.toContain(
      "frame-ancestors",
    );
  });

  it("allows eval and a reload socket only in development", () => {
    expect(directive(contentSecurityPolicy(base), "script-src")).not.toContain("'unsafe-eval'");
    const development = contentSecurityPolicy({ ...base, development: true });
    expect(directive(development, "script-src")).toContain("'unsafe-eval'");
    expect(directive(development, "connect-src")).toContain("ws:");
  });
});
