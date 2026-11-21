import nodemailer, { type Transporter } from "nodemailer";

import { type EmailAdapter } from "./types";

/** An SMTP server and its sign-in, given as plain values, so nothing needs encoding. */
export interface SmtpServer {
  host: string;
  port: number;
  /** Empty for a server that takes mail without signing in. */
  user: string;
  password: string;
}

/** Port 465 speaks TLS from the start; the others, such as 587, upgrade with STARTTLS. */
function transportFor(server: string | SmtpServer): Transporter {
  if (typeof server === "string") return nodemailer.createTransport(server);
  return nodemailer.createTransport({
    host: server.host,
    port: server.port,
    secure: server.port === 465,
    ...(server.user ? { auth: { user: server.user, pass: server.password } } : {}),
  });
}

/**
 * Sends through any SMTP server, which every mail provider offers, so this is the option that
 * always works. `server` is either an address with its sign-in details, such as
 * `smtps://user:password@smtp.example.com:465`, or the same as plain values. `transport` is
 * for tests.
 */
export function createSmtpAdapter(
  server: string | SmtpServer,
  transport: Transporter = transportFor(server),
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
          ...(message.messageId === undefined ? {} : { messageId: `<${message.messageId}>` }),
          ...(message.inReplyTo === undefined ? {} : { inReplyTo: `<${message.inReplyTo}>` }),
          ...(message.references === undefined
            ? {}
            : { references: message.references.map((id) => `<${id}>`) }),
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
