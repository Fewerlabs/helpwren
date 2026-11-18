import { describe, expect, it } from "vitest";

import { newCannedReplySchema } from "./canned-reply";

describe("newCannedReplySchema", () => {
  it("accepts a complete reply and trims the edges", () => {
    expect(
      newCannedReplySchema.parse({ title: "  Greeting ", shortcut: "hello", body: " Hi there. " }),
    ).toEqual({ title: "Greeting", shortcut: "hello", body: "Hi there." });
  });

  it.each([
    [{ title: "", shortcut: "hello", body: "Hi" }, "title", "Give the reply a title."],
    [{ title: "Greeting", shortcut: "", body: "Hi" }, "shortcut", "Choose a shortcut."],
    [
      { title: "Greeting", shortcut: "Hello World", body: "Hi" },
      "shortcut",
      "Use lower-case letters, numbers and hyphens only.",
    ],
    [{ title: "Greeting", shortcut: "hello", body: "   " }, "body", "Write the reply."],
  ])("rejects %j with a message on %s", (input, field, message) => {
    const result = newCannedReplySchema.safeParse(input);
    expect(result.success).toBe(false);
    const issue = result.error?.issues.find((item) => item.path[0] === field);
    expect(issue?.message).toBe(message);
  });
});
