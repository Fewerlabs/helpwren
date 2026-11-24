import { describe, expect, it } from "vitest";

import { embedQuery, hides, parseHelpEmbed, withEmbed } from "./help-embed";

const parse = (query: string) => parseHelpEmbed(new URLSearchParams(query));

describe("parseHelpEmbed", () => {
  it("is off unless the address asks for exactly embed=1", () => {
    expect(parse("")).toBeNull();
    expect(parse("embed=true")).toBeNull();
    expect(parse("hide=search")).toBeNull();
    expect(parse("embed=1")).toEqual({ hide: [] });
  });

  it("keeps the parts it knows, in page order, and drops the rest", () => {
    expect(parse("embed=1&hide=chat,search,nonsense,<script>")?.hide).toEqual(["search", "chat"]);
    expect(parse("embed=1&hide=related, Title,breadcrumbs,footer")?.hide).toEqual([
      "title",
      "breadcrumbs",
      "related",
    ]);
    expect(parse("embed=1&hide=title,subtitle,popular,collections")?.hide).toEqual([
      "title",
      "subtitle",
      "collections",
      "popular",
    ]);
  });

  it("says whether a part is hidden, outside a frame too", () => {
    const embed = parse("embed=1&hide=title");
    expect(hides(embed, "title")).toBe(true);
    expect(hides(embed, "search")).toBe(false);
    expect(hides(null, "title")).toBe(false);
  });

  it("takes padding, background and theme only from their known values", () => {
    expect(parse("embed=1&padding=none&bg=transparent&theme=dark")).toEqual({
      hide: [],
      padding: "none",
      background: "transparent",
      theme: "dark",
    });
    expect(parse("embed=1&padding=compact&bg=F8FAFC")).toMatchObject({
      padding: "compact",
      background: "#f8fafc",
    });
    expect(parse("embed=1&padding=lots&bg=red;color:x&theme=blue")).toEqual({ hide: [] });
  });

  it("takes an audience, and keeps it on every link", () => {
    const embed = parse("embed=1&audience=Business");
    expect(embed?.audience).toBe("business");
    expect(withEmbed("/help/billing", embed)).toBe("/help/billing?embed=1&audience=business");
    expect(parse(`embed=1&audience=${"a".repeat(61)}`)).toEqual({ hide: [] });
  });

  it("takes a colour only as six hex digits", () => {
    expect(parse("embed=1&accent=1D4ED8")?.accent).toBe("#1d4ed8");
    expect(parse("embed=1&accent=%231d4ed8")?.accent).toBe("#1d4ed8");
    for (const bad of ["red", "1d4", "1d4ed8;background:url(x)", "var(--x)", "1d4ed8ff"]) {
      expect(parse(`embed=1&accent=${encodeURIComponent(bad)}`)?.accent).toBeUndefined();
    }
  });

  it("takes a collection only as a slug, and trims a search", () => {
    expect(parse("embed=1&collection=getting-started")?.collection).toBe("getting-started");
    expect(parse("embed=1&collection=../dashboard")?.collection).toBeUndefined();
    expect(parse("embed=1&q=%20refund%20")?.query).toBe("refund");
    expect(parse(`embed=1&q=${"a".repeat(500)}`)?.query).toHaveLength(200);
  });
});

describe("links inside the frame", () => {
  const embed = { hide: ["search", "chat"] as const, accent: "#1d4ed8", collection: "billing" };

  it("carry the look and what is hidden, and not where to open", () => {
    expect(embedQuery(embed)).toBe("embed=1&hide=search,chat&accent=1d4ed8");
    expect(
      embedQuery({
        hide: ["title"],
        padding: "compact",
        background: "#ffffff",
        theme: "light",
      }),
    ).toBe("embed=1&hide=title&padding=compact&bg=ffffff&theme=light");
  });

  it("come back out as the same options", () => {
    const query = "embed=1&hide=title,subtitle,popular&padding=none&bg=transparent&theme=dark";
    const parsed = parse(query);
    expect(parsed && embedQuery(parsed)).toBe(query);
    expect(withEmbed("/help/billing", parsed)).toBe(`/help/billing?${query}`);
  });

  it("are left alone outside a frame", () => {
    expect(withEmbed("/help/billing", null)).toBe("/help/billing");
  });

  it("keep their own query and their anchor", () => {
    expect(withEmbed("/help/billing", { hide: [] })).toBe("/help/billing?embed=1");
    expect(withEmbed("/help/search?q=tax", { hide: [] })).toBe("/help/search?q=tax&embed=1");
    expect(withEmbed("/help/a/b#steps", { hide: [] })).toBe("/help/a/b?embed=1#steps");
  });
});
