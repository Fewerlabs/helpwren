import { describe, expect, it } from "vitest";

import { richTextSchema, richTextToPlainText } from "./rich-text";

const body = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Before you start" }] },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "You are an " },
        { type: "text", text: "admin", marks: [{ type: "bold" }] },
        { type: "text", text: "." },
      ],
    },
  ],
};

describe("richTextSchema", () => {
  it("accepts a document made of known nodes and marks", () => {
    expect(richTextSchema.parse(body)).toEqual(body);
  });

  it("refuses a kind of node it does not know, such as a script", () => {
    const withScript = { type: "doc", content: [{ type: "script", text: "alert(1)" }] };
    expect(richTextSchema.safeParse(withScript).success).toBe(false);
  });

  it("refuses a mark it does not know", () => {
    const marked = {
      type: "doc",
      content: [{ type: "text", text: "x", marks: [{ type: "onclick" }] }],
    };
    expect(richTextSchema.safeParse(marked).success).toBe(false);
  });

  it("refuses anything that is not a document at the top", () => {
    expect(richTextSchema.safeParse({ type: "paragraph" }).success).toBe(false);
  });
});

describe("richTextToPlainText", () => {
  it("joins every piece of text in reading order", () => {
    expect(richTextToPlainText(richTextSchema.parse(body))).toBe(
      "Before you start You are an admin.",
    );
  });
});
