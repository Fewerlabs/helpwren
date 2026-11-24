import { describe, expect, it } from "vitest";

import { matchHelpRule, pickHelpFilter, urlMatches, type HelpRule } from "./help-rules";

describe("urlMatches", () => {
  it("'is' takes exactly one path, with or without a final slash or a query", () => {
    expect(urlMatches("is", "/settings/billing", "https://app.example.com/settings/billing")).toBe(
      true,
    );
    expect(
      urlMatches("is", "/settings/billing/", "https://app.example.com/Settings/Billing/?a=1"),
    ).toBe(true);
    expect(urlMatches("is", "/settings", "https://app.example.com/settings/billing")).toBe(false);
    expect(urlMatches("is", "/", "https://example.com")).toBe(true);
  });

  it("'matches' treats * as anything, and a final /* takes the bare path too", () => {
    const pattern = "/bookings/*";
    expect(urlMatches("matches", pattern, "https://app.example.com/bookings")).toBe(true);
    expect(urlMatches("matches", pattern, "https://app.example.com/bookings/")).toBe(true);
    expect(urlMatches("matches", pattern, "https://app.example.com/bookings/42/edit")).toBe(true);
    expect(urlMatches("matches", pattern, "https://app.example.com/bookingsx")).toBe(false);
    expect(urlMatches("matches", pattern, "https://app.example.com/old/bookings/1")).toBe(false);
    expect(urlMatches("matches", "/orders/*/refund", "https://x.io/orders/7/refund")).toBe(true);
    expect(urlMatches("matches", "/orders/*/refund", "https://x.io/orders/7/refunds")).toBe(false);
  });

  it("reads the characters of a pattern literally, apart from *", () => {
    expect(urlMatches("matches", "/a.b/*", "https://x.io/a.b/c")).toBe(true);
    expect(urlMatches("matches", "/a.b/*", "https://x.io/axb/c")).toBe(false);
    expect(urlMatches("matches", "/(x)+", "https://x.io/(x)+")).toBe(true);
  });

  it("looks at the host too when the value does not start with a slash", () => {
    const url = "https://app.example.com/bookings/1";
    expect(urlMatches("matches", "app.example.com/bookings/*", url)).toBe(true);
    expect(urlMatches("matches", "https://app.example.com/bookings/*", url)).toBe(true);
    expect(urlMatches("matches", "www.example.com/bookings/*", url)).toBe(false);
    expect(urlMatches("matches", "*.example.com/bookings/*", url)).toBe(true);
    expect(urlMatches("is", "app.example.com/bookings/1", url)).toBe(true);
  });

  it("'contains' looks anywhere in the host, path and query, ignoring case", () => {
    expect(urlMatches("contains", "checkout", "https://shop.io/cart/Checkout?step=2")).toBe(true);
    expect(urlMatches("contains", "step=2", "https://shop.io/cart?step=2")).toBe(true);
    expect(urlMatches("contains", "shop.io/cart/", "https://shop.io/cart/")).toBe(true);
    expect(urlMatches("contains", "checkout", "https://shop.io/cart#checkout")).toBe(false);
  });

  it("matches nothing for an address that is not one, or an empty value", () => {
    expect(urlMatches("contains", "a", "not a url")).toBe(false);
    expect(urlMatches("is", "  ", "https://x.io/")).toBe(false);
  });
});

function rule(overrides: Partial<HelpRule>): HelpRule {
  return {
    id: crypto.randomUUID(),
    name: "Rule",
    urlMatch: "matches",
    urlValue: "/bookings/*",
    audience: null,
    filter: { collection: "bookings" },
    enabled: true,
    position: 1,
    updatedAt: "2026-11-20T00:00:00Z",
    ...overrides,
  };
}

describe("matchHelpRule", () => {
  const url = "https://app.example.com/bookings/1";

  it("takes the first rule in order that matches", () => {
    const later = rule({ name: "Later", position: 2 });
    const first = rule({ name: "First", position: 1, urlMatch: "contains", urlValue: "book" });
    expect(matchHelpRule([later, first], { url })?.name).toBe("First");
  });

  it("skips a rule that is switched off, or whose filter cannot be read", () => {
    const off = rule({ name: "Off", position: 1, enabled: false });
    const broken = rule({ name: "Broken", position: 2, filter: null });
    const on = rule({ name: "On", position: 3 });
    expect(matchHelpRule([off, broken, on], { url })?.name).toBe("On");
  });

  it("keeps a rule for one audience to visitors in it", () => {
    const business = rule({ name: "Business", audience: "business", position: 1 });
    const everyone = rule({ name: "Everyone", position: 2 });
    expect(matchHelpRule([business, everyone], { url, audience: "Business" })?.name).toBe(
      "Business",
    );
    expect(matchHelpRule([business, everyone], { url, audience: "customer" })?.name).toBe(
      "Everyone",
    );
    expect(matchHelpRule([business, everyone], { url })?.name).toBe("Everyone");
  });

  it("gives null when nothing matches", () => {
    expect(matchHelpRule([rule({})], { url: "https://app.example.com/billing" })).toBeNull();
  });
});

describe("pickHelpFilter", () => {
  const rules = [rule({ name: "Bookings" })];
  const url = "https://app.example.com/bookings/1";

  it("lets a page's own filter beat a rule that matches", () => {
    const picked = pickHelpFilter({ filter: { tags: { any: ["refunds"] } }, rules, url });
    expect(picked).toEqual({ kind: "filter", filter: { tags: { any: ["refunds"] } } });
  });

  it("uses the first rule that matches when the page sends no filter", () => {
    const picked = pickHelpFilter({ rules, url });
    expect(picked?.kind === "rule" && picked.rule.name).toBe("Bookings");
    expect(picked?.filter).toEqual({ collection: "bookings" });
  });

  it("puts the page's audience before the visitor's, but matches rules on the visitor's", () => {
    const picked = pickHelpFilter({ rules, url, audience: "business", pageAudience: "customer" });
    expect(picked?.filter.audience).toBe("customer");
    const only = rule({ name: "Business", audience: "business", position: 1 });
    expect(pickHelpFilter({ rules: [only], url, pageAudience: "business" })).toBeNull();
  });

  it("fills in the visitor's audience, unless the filter names one", () => {
    expect(pickHelpFilter({ rules, url, audience: "business" })?.filter).toEqual({
      collection: "bookings",
      audience: "business",
    });
    expect(
      pickHelpFilter({ filter: { audience: "customer" }, rules, url, audience: "business" })
        ?.filter,
    ).toEqual({ audience: "customer" });
  });

  it("gives null with no filter and no page, or no rule that matches", () => {
    expect(pickHelpFilter({ rules })).toBeNull();
    expect(pickHelpFilter({ rules, url: "https://app.example.com/billing" })).toBeNull();
  });
});
