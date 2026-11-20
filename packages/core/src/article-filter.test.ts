import { describe, expect, it } from "vitest";

import {
  articleFilterSchema,
  describeArticleFilter,
  isEmptyFilter,
  parseArticleFilterParams,
} from "./article-filter";

describe("articleFilterSchema", () => {
  it("takes a filter with every part, and cleans it up", () => {
    const filter = articleFilterSchema.parse({
      collection: ["bookings", "Payments"],
      tags: { any: ["Refunds", "refunds", "cancellations"], none: ["internal"] },
      q: "  cancel booking ",
      audience: "Business",
      locale: "pt-BR",
      fields: { plan: "pro", version: 2.3, beta: true },
      articles: ["how-refunds-work"],
      sort: "position",
      limit: 5,
    });
    expect(filter).toEqual({
      collection: ["bookings", "payments"],
      tags: { any: ["refunds", "cancellations"], none: ["internal"] },
      q: "cancel booking",
      audience: "business",
      locale: "pt-br",
      fields: { plan: "pro", version: "2.3", beta: "true" },
      articles: ["how-refunds-work"],
      sort: "position",
      limit: 5,
    });
  });

  it("takes something as small as one kind of tag", () => {
    expect(articleFilterSchema.parse({ tags: { any: ["refunds"] } })).toEqual({
      tags: { any: ["refunds"] },
    });
  });

  it("refuses parts that could not be meant", () => {
    for (const bad of [
      { limit: 0 },
      { limit: 51 },
      { limit: 2.5 },
      { sort: "random" },
      { collection: "Not a slug!" },
      { tags: { any: [] } },
      { locale: "english" },
      { fields: { "Plan Name": "pro" } },
      { fields: { plan: "" } },
      { articles: [] },
    ]) {
      expect(articleFilterSchema.safeParse(bad).success, JSON.stringify(bad)).toBe(false);
    }
  });

  it("drops parts it does not know", () => {
    expect(articleFilterSchema.parse({ tags: { any: ["a"] }, colour: "red" })).toEqual({
      tags: { any: ["a"] },
    });
  });

  it("tells an empty filter from one that says something", () => {
    expect(isEmptyFilter(articleFilterSchema.parse({}))).toBe(true);
    expect(isEmptyFilter(articleFilterSchema.parse({ limit: 3 }))).toBe(false);
  });
});

describe("parseArticleFilterParams", () => {
  const parse = (query: string) => parseArticleFilterParams(new URLSearchParams(query));

  it("reads the filter the plan's example address describes", () => {
    const result = parse(
      "category=x&collection=bookings&tags=refunds,cancellations&tag_mode=any&audience=business&limit=5",
    );
    expect(result).toEqual({
      success: true,
      data: {
        collection: "bookings",
        tags: { any: ["refunds", "cancellations"] },
        audience: "business",
        limit: 5,
      },
    });
  });

  it("reads several collections, custom fields, pinned articles and the other modes", () => {
    const result = parse(
      "collection=a,b&tags=internal&tag_mode=none&field.plan=pro&field.feature=calendar&articles=first,second&q=cancel&locale=en&sort=updated",
    );
    expect(result.success && result.data).toEqual({
      collection: ["a", "b"],
      tags: { none: ["internal"] },
      fields: { plan: "pro", feature: "calendar" },
      articles: ["first", "second"],
      q: "cancel",
      locale: "en",
      sort: "updated",
    });
  });

  it("gives an empty filter for no query at all", () => {
    expect(parse("")).toEqual({ success: true, data: {} });
  });

  it("refuses a tag mode it does not know, and a limit that is not a number", () => {
    expect(parse("tags=a&tag_mode=some").success).toBe(false);
    expect(parse("limit=lots").success).toBe(false);
  });
});

describe("describeArticleFilter", () => {
  it("names each part in a short phrase", () => {
    expect(
      describeArticleFilter(
        articleFilterSchema.parse({
          collection: "bookings",
          tags: { any: ["refunds", "billing"] },
          q: "payment failed",
          fields: { plan: "pro" },
          limit: 3,
        }),
      ),
    ).toEqual([
      "Collection bookings",
      "Tags any of refunds, billing",
      "Search “payment failed”",
      "plan is pro",
      "limit 3",
    ]);
  });

  it("says when a filter picks everything", () => {
    expect(describeArticleFilter({})).toEqual(["Every published article"]);
  });
});
