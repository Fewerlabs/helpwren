import { createHmac } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import { createResendInbound, verifySvix } from "./resend";

// A secret in Svix's shape: `whsec_` and base64.
const SECRET = `whsec_${Buffer.from("resend-test-signing-secret-32by").toString("base64")}`;
const NOW = 1_795_000_000_000;

// The `email.received` event as Resend documents it.
const event = {
  type: "email.received",
  created_at: "2026-11-19T10:00:00.000Z",
  data: {
    email_id: "56761188-7520-42d8-8898-ff6fc54ce618",
    created_at: "2026-11-19T10:00:00.000Z",
    from: "Priya Shah <Priya@Example.org>",
    to: ["reply+abc123@support.acme.example"],
    bcc: [],
    cc: ["colleague@example.org"],
    received_for: ["reply+abc123@support.acme.example"],
    message_id: "<CAF=reply-1@mail.gmail.com>",
    subject: "Re: New reply from Acme",
    attachments: [
      {
        id: "att-1",
        filename: "receipt.pdf",
        content_type: "application/pdf",
        content_disposition: "attachment",
        content_id: null,
      },
    ],
  },
};

// What the received-email API answers for it.
const received = {
  object: "email",
  id: event.data.email_id,
  to: event.data.to,
  from: event.data.from,
  subject: event.data.subject,
  html: "<p>Thanks, that worked.</p>",
  text: "Thanks, that worked.\n\nOn Tue, 18 Nov 2026 at 10:00, Acme <support@acme.example> wrote:\n> It ships tomorrow.",
  headers: {
    "in-reply-to": "<helpwren.c1.r1@support.acme.example>",
    references: "<helpwren.c1@support.acme.example> <helpwren.c1.r1@support.acme.example>",
  },
  message_id: "<CAF=reply-1@mail.gmail.com>",
  attachments: [
    {
      id: "att-1",
      filename: "receipt.pdf",
      content_type: "application/pdf",
      content_disposition: "attachment",
      content_id: null,
      size: 5,
    },
  ],
};

function signed(body: string, at = NOW, secret = SECRET) {
  const id = "msg_2Kd9";
  const timestamp = String(Math.floor(at / 1000));
  const signature = createHmac("sha256", Buffer.from(secret.slice(6), "base64"))
    .update(`${id}.${timestamp}.${body}`)
    .digest("base64");
  return {
    body,
    headers: new Headers({
      "svix-id": id,
      "svix-timestamp": timestamp,
      // Svix may send several; any one that matches is enough.
      "svix-signature": `v1,bm90IGl0 v1,${signature}`,
    }),
  };
}

function resendApi() {
  return vi.fn((url: string | URL | Request) => {
    const path = url instanceof Request ? url.url : url.toString();
    if (path.endsWith("/attachments")) {
      return Promise.resolve(
        Response.json({
          object: "list",
          has_more: false,
          data: [{ id: "att-1", download_url: "https://files.resend.example/att-1" }],
        }),
      );
    }
    if (path === "https://files.resend.example/att-1") {
      return Promise.resolve(new Response("%PDF-"));
    }
    return Promise.resolve(Response.json(received));
  });
}

describe("verifySvix", () => {
  const body = JSON.stringify(event);

  it("accepts Resend's signature over the id, the time and the body", () => {
    expect(verifySvix(signed(body), SECRET, NOW)).toBe(true);
  });

  it("turns away a changed body, another secret, an old request and a missing header", () => {
    const request = signed(body);
    expect(verifySvix({ ...request, body: `${body} ` }, SECRET, NOW)).toBe(false);
    expect(verifySvix(signed(body, NOW, `whsec_${btoa("another")}`), SECRET, NOW)).toBe(false);
    expect(verifySvix(signed(body, NOW - 10 * 60 * 1000), SECRET, NOW)).toBe(false);
    expect(verifySvix({ body, headers: new Headers() }, SECRET, NOW)).toBe(false);
  });
});

describe("the Resend inbound adapter", () => {
  it("reads the email through the API, with every address it was for", async () => {
    const fetch = resendApi();
    const adapter = createResendInbound({
      signingSecret: SECRET,
      apiKey: "re_test",
      fetch,
      apiUrl: "https://api.resend.example",
      now: () => NOW,
    });
    const request = signed(JSON.stringify(event));

    expect(adapter.verify(request)).toBe(true);
    const email = await adapter.parse(request);

    expect(fetch).toHaveBeenCalledWith(
      `https://api.resend.example/emails/receiving/${event.data.email_id}`,
      expect.objectContaining({ headers: { authorization: "Bearer re_test" } }),
    );
    expect(email).toMatchObject({
      from: { address: "priya@example.org", name: "Priya Shah" },
      recipients: [
        "reply+abc123@support.acme.example",
        "colleague@example.org",
        "reply+abc123@support.acme.example",
      ],
      subject: "Re: New reply from Acme",
      text: received.text,
      html: received.html,
      messageId: "CAF=reply-1@mail.gmail.com",
      providerId: event.data.email_id,
      inReplyTo: "helpwren.c1.r1@support.acme.example",
      references: ["helpwren.c1@support.acme.example", "helpwren.c1.r1@support.acme.example"],
    });

    // Files are fetched only when asked for, through a fresh download link.
    expect(fetch).toHaveBeenCalledTimes(1);
    const [file] = email.attachments;
    expect(file).toMatchObject({ name: "receipt.pdf", type: "application/pdf", size: 5 });
    expect(new TextDecoder().decode(await file?.content())).toBe("%PDF-");
  });

  it("refuses an event that is not a received email", async () => {
    const adapter = createResendInbound({ signingSecret: SECRET, apiKey: "re_test" });
    await expect(
      adapter.parse({
        body: JSON.stringify({ type: "email.sent", data: {} }),
        headers: new Headers(),
      }),
    ).rejects.toThrow("Not an email.received event.");
    await expect(adapter.parse({ body: "not json", headers: new Headers() })).rejects.toThrow(
      "The body is not JSON.",
    );
  });
});
