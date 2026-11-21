import { createServer, type Server, type Socket } from "node:net";

/** One email an SMTP catcher was given, with the sign-in it was sent under. */
export interface CaughtEmail {
  user: string;
  password: string;
  from: string;
  to: string[];
  data: string;
}

export interface SmtpCatcher {
  port: number;
  emails: CaughtEmail[];
  close: () => Promise<void>;
}

/**
 * A tiny SMTP server for tests: it signs anyone in with AUTH PLAIN or LOGIN, takes every
 * message and keeps it, so a test can read what the install sent and how it signed in.
 * Plain text only, as port 587 is before STARTTLS; enough for nodemailer.
 */
export async function startSmtpCatcher(): Promise<SmtpCatcher> {
  const emails: CaughtEmail[] = [];
  const server: Server = createServer((socket: Socket) => {
    let buffer = "";
    let mode: "command" | "data" | "login-user" | "login-pass" = "command";
    let current: CaughtEmail = { user: "", password: "", from: "", to: [], data: "" };
    const reply = (line: string) => socket.write(`${line}\r\n`);
    const decode = (text: string) => Buffer.from(text, "base64").toString("utf8");

    reply("220 catcher ready");
    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      let end: number;
      while ((end = buffer.indexOf("\r\n")) !== -1) {
        const line = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        if (mode === "data") {
          if (line === ".") {
            emails.push(current);
            current = { ...current, from: "", to: [], data: "" };
            mode = "command";
            reply("250 kept");
          } else {
            current.data += `${line}\n`;
          }
          continue;
        }
        if (mode === "login-user") {
          current.user = decode(line);
          mode = "login-pass";
          reply("334 UGFzc3dvcmQ6");
          continue;
        }
        if (mode === "login-pass") {
          current.password = decode(line);
          mode = "command";
          reply("235 signed in");
          continue;
        }
        const [verb = "", ...rest] = line.split(" ");
        switch (verb.toUpperCase()) {
          case "EHLO":
            socket.write("250-catcher\r\n250-AUTH PLAIN LOGIN\r\n250 8BITMIME\r\n");
            break;
          case "HELO":
            reply("250 catcher");
            break;
          case "AUTH": {
            const [method = "", initial] = rest;
            if (method.toUpperCase() === "PLAIN" && initial) {
              const [, user = "", password = ""] = decode(initial).split("\0");
              Object.assign(current, { user, password });
              reply("235 signed in");
            } else {
              mode = "login-user";
              reply("334 VXNlcm5hbWU6");
            }
            break;
          }
          case "MAIL":
            current.from = line.replace(/^MAIL FROM:\s*/i, "");
            reply("250 ok");
            break;
          case "RCPT":
            current.to.push(line.replace(/^RCPT TO:\s*/i, ""));
            reply("250 ok");
            break;
          case "DATA":
            mode = "data";
            reply("354 go ahead");
            break;
          case "QUIT":
            reply("221 bye");
            socket.end();
            break;
          default:
            reply("250 ok");
        }
      }
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("No port");
  return {
    port: address.port,
    emails,
    close: () =>
      new Promise((resolve) =>
        server.close(() => {
          resolve();
        }),
      ),
  };
}
