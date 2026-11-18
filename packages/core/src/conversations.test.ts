import { describe, expect, it } from "vitest";

import {
  hasRequiredGuestDetails,
  phoneSchema,
  startConversationInputSchema,
} from "./conversations";

describe("startConversationInputSchema", () => {
  it("needs only a message, and fills in the rest", () => {
    expect(startConversationInputSchema.parse({ message: "  Hello  " })).toEqual({
      message: "Hello",
      source: "web",
      contact: {},
    });
  });

  it("tidies contact details", () => {
    const input = startConversationInputSchema.parse({
      message: "Hello",
      contact: { name: " Ada ", email: " Ada@Example.com ", phone: "+447700900123" },
    });
    expect(input.contact).toEqual({
      name: "Ada",
      email: "ada@example.com",
      phone: "+447700900123",
    });
  });

  it.each([
    ["an empty message", { message: "   " }],
    ["a message that is too long", { message: "a".repeat(5001) }],
    ["a malformed email", { message: "Hi", contact: { email: "ada" } }],
    ["a page that is not a URL", { message: "Hi", page: { url: "pricing" } }],
  ])("rejects %s", (_, input) => {
    expect(startConversationInputSchema.safeParse(input).success).toBe(false);
  });
});

describe("phoneSchema", () => {
  it("accepts international format", () => {
    expect(phoneSchema.parse(" +2348012345678 ")).toBe("+2348012345678");
  });

  it.each(["08012345678", "+0123456789", "+44 7700 900123", "+123"])("rejects %j", (phone) => {
    expect(phoneSchema.safeParse(phone).success).toBe(false);
  });
});

describe("hasRequiredGuestDetails", () => {
  const name = "Ada";
  const email = "ada@example.com";
  const phone = "+447700900123";

  it.each([
    ["none", {}, true],
    ["email", { name, email }, true],
    ["email", { name, phone }, false],
    ["email", { email }, false],
    ["phone", { name, phone }, true],
    ["phone", { name, email }, false],
    ["email_or_phone", { name, email }, true],
    ["email_or_phone", { name, phone }, true],
    ["email_or_phone", { name }, false],
    ["email_or_phone", { name: null, email }, false],
  ] as const)("when the setting is %s, %j gives %s", (required, details, expected) => {
    expect(hasRequiredGuestDetails(required, details)).toBe(expected);
  });
});
