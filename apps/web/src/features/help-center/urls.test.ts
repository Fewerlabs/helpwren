import { parseSettings } from "@helpwren/core";
import { describe, expect, it } from "vitest";

import { articlePath, canonicalUrl, collectionPath, searchPath } from "./urls";

const settings = (helpCenter: Record<string, unknown> = {}) =>
  parseSettings([{ key: "help_center", value: helpCenter }]);

describe("help center addresses", () => {
  it("builds the paths of collections, articles and searches", () => {
    expect(collectionPath("billing")).toBe("/help/billing");
    expect(articlePath("billing", "read-your-invoice")).toBe("/help/billing/read-your-invoice");
    expect(searchPath("refund & cancel")).toBe("/help/search?q=refund%20%26%20cancel");
  });

  it("uses this install's own address when the help center is served from it", () => {
    expect(canonicalUrl(settings())).toBe("http://localhost:3000/help");
    expect(canonicalUrl(settings(), "/help/billing/read-your-invoice")).toBe(
      "http://localhost:3000/help/billing/read-your-invoice",
    );
  });

  it("uses the other site's address when the help center is served through it", () => {
    const proxied = settings({ url: "https://acme.example/support" });
    expect(canonicalUrl(proxied)).toBe("https://acme.example/support");
    expect(canonicalUrl(proxied, "/help/billing")).toBe("https://acme.example/support/billing");
  });
});
