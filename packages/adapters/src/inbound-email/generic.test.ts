import { describe, expect, it } from "vitest";

import { signWebhook, WEBHOOK_SIGNATURE_HEADER } from "../push/webhook";
import { createGenericInbound, type GenericInboundEmail } from "./generic";

const SECRET = "whsec_generic_inbound_secret";
const NOW = 1_795_000_000_000;

const sample: GenericInboundEmail = {
  from: "Priya Shah <priya@example.org>",
  to: ["Acme <reply+abc123@support.acme.example>"],
  deliveredTo: ["reply+abc123@support.acme.example"],
  subject: "Re: New reply from Acme",
  text: "Thanks!",
  messageId: "<reply-2@example.org>",
  inReplyTo: "<helpwren.c1.r1@support.acme.example>",
  references: ["<helpwren.c1@support.acme.example>"],
  attachments: [{ name: "notes.txt", type: "text/plain", content: btoa("hello") }],
};

function signed(body: string, at = NOW, secret = SECRET) {
  return {
    body,
    headers: new Headers({
      [WEBHOOK_SIGNATURE_HEADER]: signWebhook(body, secret, Math.floor(at / 1000)),
    }),
  };
}

describe("the generic inbound adapter", () => {
  const adapter = createGenericInbound({ secret: SECRET, now: () => NOW });

  it("accepts a body signed with the install's secret, and nothing else", () => {
    const body = JSON.stringify(sample);
    expect(adapter.verify(signed(body))).toBe(true);
    expect(adapter.verify({ ...signed(body), body: body.replace("Thanks", "Thank") })).toBe(false);
    expect(adapter.verify(signed(body, NOW, "whsec_someone_else"))).toBe(false);
    expect(adapter.verify(signed(body, NOW - 6 * 60 * 1000))).toBe(false);
    expect(adapter.verify({ body, headers: new Headers() })).toBe(false);
  });

  it("reads the normalised shape", async () => {
    const email = await adapter.parse(signed(JSON.stringify(sample)));
    expect(email).toMatchObject({
      from: { address: "priya@example.org", name: "Priya Shah" },
      recipients: ["reply+abc123@support.acme.example", "reply+abc123@support.acme.example"],
      text: "Thanks!",
      html: null,
      messageId: "reply-2@example.org",
      inReplyTo: "helpwren.c1.r1@support.acme.example",
      references: ["helpwren.c1@support.acme.example"],
    });
    expect(email.attachments[0]).toMatchObject({ name: "notes.txt", size: 5, inline: false });
    expect(new TextDecoder().decode(await email.attachments[0]?.content())).toBe("hello");
  });

  it("says what is wrong with a body that is not the shape", async () => {
    await expect(adapter.parse(signed(JSON.stringify({ from: "x" })))).rejects.toThrow(/to/);
  });
});
