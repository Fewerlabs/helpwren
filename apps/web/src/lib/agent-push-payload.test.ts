import { describe, expect, it } from "vitest";

import { AGENT_PREVIEW_LENGTH, buildAgentPushPayload, previewOf } from "./agent-push-payload";

const conversationId = "2f0c6c1e-6d1b-4d36-9a52-2f4f1c1f0e11";
const nobody = { name: null, email: null, phone: null };

describe("buildAgentPushPayload", () => {
  it("names the contact and links to the conversation", () => {
    expect(
      buildAgentPushPayload({
        conversationId,
        contact: { name: "Priya", email: "priya@example.com", phone: null },
        body: "Where is my order?",
      }),
    ).toEqual({
      title: "Priya",
      body: "Where is my order?",
      url: `/dashboard/inbox?view=all&c=${conversationId}`,
      tag: conversationId,
    });
  });

  it("calls a contact with no name by how they can be reached, or a guest", () => {
    const email = { ...nobody, email: "sam@example.com" };
    expect(buildAgentPushPayload({ conversationId, contact: email, body: "Hi" }).title).toBe(
      "sam@example.com",
    );
    expect(buildAgentPushPayload({ conversationId, contact: nobody, body: "Hi" }).title).toBe(
      "Guest",
    );
  });

  it("never carries more than a short preview", () => {
    const long = "word ".repeat(200);
    const { body } = buildAgentPushPayload({ conversationId, contact: nobody, body: long });
    expect(body.length).toBeLessThanOrEqual(AGENT_PREVIEW_LENGTH);
    expect(body.endsWith("…")).toBe(true);
  });
});

describe("previewOf", () => {
  it("puts the message on one line", () => {
    expect(previewOf("Hello\n\n  there")).toBe("Hello there");
  });

  it("cuts at a word", () => {
    expect(previewOf("The quick brown fox jumps", 12)).toBe("The quick…");
  });

  it("cuts inside a word that is too long to break", () => {
    expect(previewOf("a".repeat(50), 10)).toBe(`${"a".repeat(9)}…`);
  });

  it("describes a message that is only files", () => {
    expect(previewOf(null)).toBe("Sent a file.");
    expect(previewOf("   ")).toBe("Sent a file.");
  });
});
