import nodemailer from "nodemailer";
import { describe, expect, it, vi } from "vitest";

import { createResendAdapter } from "./resend";
import { createSmtpAdapter } from "./smtp";

const from = { name: "Acme Support", address: "support@acme.example" };
const message = {
  to: "priya@example.org",
  subject: "We replied",
  text: "Hello Priya",
  html: "<p>Hello Priya</p>",
  replyTo: "reply+abc@acme.example",
};

describe("the SMTP adapter", () => {
  it("sends the message from the install's name and address", async () => {
    // Builds the email without a server, so what would be sent can be read.
    const transport = nodemailer.createTransport({ jsonTransport: true });
    const sendMail = vi.spyOn(transport, "sendMail");

    await expect(
      createSmtpAdapter("smtp://unused", transport).send(message, from),
    ).resolves.toEqual({ ok: true });
    expect(sendMail).toHaveBeenCalledWith({
      from: { name: "Acme Support", address: "support@acme.example" },
      to: "priya@example.org",
      subject: "We replied",
      text: "Hello Priya",
      html: "<p>Hello Priya</p>",
      replyTo: "reply+abc@acme.example",
    });
  });

  it("tells a refusal by the server from a server it could not reach", async () => {
    const transport = nodemailer.createTransport({ jsonTransport: true });
    const adapter = createSmtpAdapter("smtp://unused", transport);

    vi.spyOn(transport, "sendMail").mockRejectedValueOnce(
      Object.assign(new Error("550 Sender not allowed"), { responseCode: 550 }),
    );
    await expect(adapter.send(message, from)).resolves.toEqual({
      ok: false,
      reason: "rejected",
      detail: "550 Sender not allowed",
    });

    vi.spyOn(transport, "sendMail").mockRejectedValueOnce(new Error("connect ECONNREFUSED"));
    await expect(adapter.send(message, from)).resolves.toEqual({
      ok: false,
      reason: "failed",
      detail: "connect ECONNREFUSED",
    });
  });
});

describe("the Resend adapter", () => {
  it("posts the message with the key, in the shape Resend takes", async () => {
    const fetcher = vi.fn<typeof fetch>(() => Promise.resolve(Response.json({ id: "1" })));

    await expect(createResendAdapter("re_test", fetcher).send(message, from)).resolves.toEqual({
      ok: true,
    });
    const [url, request] = fetcher.mock.calls[0] ?? [];
    expect(url).toBe("https://api.resend.com/emails");
    expect(new Headers(request?.headers).get("Authorization")).toBe("Bearer re_test");
    const body = typeof request?.body === "string" ? request.body : "";
    expect(JSON.parse(body)).toEqual({
      from: "Acme Support <support@acme.example>",
      to: ["priya@example.org"],
      subject: "We replied",
      text: "Hello Priya",
      html: "<p>Hello Priya</p>",
      reply_to: "reply+abc@acme.example",
    });
  });

  it("passes on why an email was refused, and says when Resend itself is down", async () => {
    const refused = vi.fn<typeof fetch>(() =>
      Promise.resolve(
        Response.json({ message: "The acme.example domain is not verified." }, { status: 403 }),
      ),
    );
    await expect(createResendAdapter("re_test", refused).send(message, from)).resolves.toEqual({
      ok: false,
      reason: "rejected",
      detail: "The acme.example domain is not verified.",
    });

    const down = vi.fn<typeof fetch>(() => Promise.resolve(new Response("oops", { status: 502 })));
    await expect(createResendAdapter("re_test", down).send(message, from)).resolves.toEqual({
      ok: false,
      reason: "failed",
      detail: "Resend answered 502.",
    });

    const offline = vi.fn<typeof fetch>(() => Promise.reject(new Error("fetch failed")));
    await expect(createResendAdapter("re_test", offline).send(message, from)).resolves.toEqual({
      ok: false,
      reason: "failed",
      detail: "fetch failed",
    });
  });
});
