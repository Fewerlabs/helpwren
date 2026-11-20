import { type Fetch } from "./auth-config.ts";
import { type Runner } from "./exec.ts";
import { type Output, type Prompter } from "./io.ts";
import { type Paths } from "./state.ts";

/** Everything a flow touches outside itself, passed in so tests can replace any of it. */
export interface Context {
  paths: Paths;
  run: Runner;
  prompt: Prompter;
  out: Output;
  fetch: Fetch;
  now: () => Date;
}

/** A problem the person can fix, with the fix in the message. Printed without a stack trace. */
export class InstallError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InstallError";
  }
}

export function validUrl(answer: string): string | null {
  try {
    const url = new URL(answer);
    return url.protocol === "http:" || url.protocol === "https:"
      ? null
      : "Enter an address that starts with http:// or https://.";
  } catch {
    return "Enter a full address, such as https://support.example.com.";
  }
}

export function validDatabaseUrl(answer: string): string | null {
  if (answer === "") return null;
  return /^postgres(ql)?:\/\/.+@.+/.test(answer)
    ? null
    : "Enter a connection string such as postgresql://postgres.ref:password@host:5432/postgres.";
}

/** Drops a trailing slash, so `https://x.com/` and `https://x.com` are the same address. */
export const trimSlash = (url: string) => url.replace(/\/+$/, "");
