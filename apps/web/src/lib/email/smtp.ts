import nodemailer, { type Transporter } from "nodemailer";

import { type EmailAdapter } from "./types";

/**
 * Sends through any SMTP server, which every mail provider offers, so this is the option that
 * always works. `url` is the server's address with its sign-in details, such as
 * `smtps://user:password@smtp.example.com:465`. `transport` is for tests.
 */
export function createSmtpAdapter(
  url: string,
  transport: Transporter = nodemailer.createTransport(url),
): EmailAdapter {
  return {
    name: "SMTP",
    async send(message, from) {
      try {
        await transport.sendMail({
          from: { name: from.name, address: from.address },
          to: message.to,
          subject: message.subject,
          text: message.text,
          ...(message.html === undefined ? {} : { html: message.html }),
          ...(message.replyTo === undefined ? {} : { replyTo: message.replyTo }),
        });
        return { ok: true };
      } catch (error) {
        // A reply code means the server was reached and said no; without one it never answered.
        const answered = typeof error === "object" && error !== null && "responseCode" in error;
        return {
          ok: false,
          reason: answered ? "rejected" : "failed",
          detail: error instanceof Error ? error.message : "The mail server gave no reason.",
        };
      }
    },
  };
}
