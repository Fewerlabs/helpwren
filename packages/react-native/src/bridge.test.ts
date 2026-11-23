import { describe, expect, it } from "vitest";

import { deliveryScript, embedUrl, greeting, isOnInstall, readFrameMessage } from "./bridge";

const BASE = "https://support.example.com";

describe("the bridge between the app and the chat", () => {
  it("asks for a dark chat, or the phone's setting, only when the app wants one", () => {
    expect(embedUrl(BASE, "customer_app", "light")).toBe(
      "https://support.example.com/embed?source=customer_app",
    );
    expect(embedUrl(BASE, "customer_app", "dark")).toBe(
      "https://support.example.com/embed?source=customer_app&theme=dark",
    );
    expect(embedUrl(BASE, "customer_app", "system")).toBe(
      "https://support.example.com/embed?source=customer_app&theme=system",
    );
  });

  it("loads the install's chat page, saying which app it is", () => {
    expect(embedUrl(BASE, "customer_app")).toBe(
      "https://support.example.com/embed?source=customer_app",
    );
    expect(embedUrl(`${BASE}/`, "business app")).toBe(
      "https://support.example.com/embed?source=business+app",
    );
  });

  it("treats only the install's own origin as its pages", () => {
    expect(isOnInstall(`${BASE}/embed?source=app`, BASE)).toBe(true);
    expect(isOnInstall("https://support.example.com.evil.test/embed", BASE)).toBe(false);
    expect(isOnInstall("http://support.example.com/embed", BASE)).toBe(false);
    expect(isOnInstall("not an address", BASE)).toBe(false);
  });

  it("hands the chat a message as data, so nothing in it can run", () => {
    const script = deliveryScript({
      channel: "helpwren",
      type: "context",
      context: { note: "</script><script>alert(1)</script>", line: "a b" },
    });

    expect(script).not.toContain("</script>");
    expect(script).not.toContain(" ");
    // The page sees exactly what was sent.
    const sent = /data: (.*) \}\)\); true;$/.exec(script)?.[1] ?? "";
    expect(JSON.parse(sent)).toEqual({
      channel: "helpwren",
      type: "context",
      context: { note: "</script><script>alert(1)</script>", line: "a b" },
    });
  });

  it("reads the chat's messages, and nothing that is not one", () => {
    expect(readFrameMessage('{"channel":"helpwren","type":"unread","count":2}')).toEqual({
      channel: "helpwren",
      type: "unread",
      count: 2,
    });
    expect(readFrameMessage('{"channel":"helpwren","type":"identity","state":"user"}')).toEqual({
      channel: "helpwren",
      type: "identity",
      state: "user",
    });
    expect(readFrameMessage('{"channel":"helpwren","type":"unread","count":-1}')).toBeNull();
    expect(readFrameMessage('{"channel":"other","type":"ready"}')).toBeNull();
    expect(readFrameMessage("not json")).toBeNull();
  });

  it("greets the chat with what it needs, in order, and no page address", () => {
    expect(
      greeting({
        closable: true,
        identified: true,
        context: { appVersion: "3.2.0" },
        conversationId: "6f9619ff-8b86-4d01-b42d-00cf4fc964ff",
      }),
    ).toEqual([
      { channel: "helpwren", type: "hello", closable: true, identified: true },
      { channel: "helpwren", type: "context", context: { appVersion: "3.2.0" } },
      {
        channel: "helpwren",
        type: "open",
        conversationId: "6f9619ff-8b86-4d01-b42d-00cf4fc964ff",
      },
    ]);
    expect(
      greeting({
        closable: false,
        identified: false,
        context: undefined,
        conversationId: undefined,
      }),
    ).toEqual([{ channel: "helpwren", type: "hello", closable: false, identified: false }]);
  });

  it("sends a screen's help filter with its context, or on its own", () => {
    expect(
      greeting({
        closable: false,
        identified: false,
        context: undefined,
        filter: { tags: { any: ["refunds"] } },
        conversationId: undefined,
      }),
    ).toEqual([
      { channel: "helpwren", type: "hello", closable: false, identified: false },
      { channel: "helpwren", type: "context", context: {}, filter: { tags: { any: ["refunds"] } } },
    ]);
  });
});
