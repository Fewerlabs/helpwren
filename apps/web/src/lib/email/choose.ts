import { createResendAdapter } from "./resend";
import { createSmtpAdapter, type SmtpServer } from "./smtp";
import { type EmailAdapter } from "./types";

/** What the server's environment says about sending mail. */
export interface EmailEnv {
  provider?: string | undefined;
  smtpUrl?: string | undefined;
  smtpHost?: string | undefined;
  smtpPort?: number | undefined;
  smtpUser?: string | undefined;
  smtpPassword?: string | undefined;
  resendApiKey?: string | undefined;
}

/** A provider saved in Settings → Email: an SMTP server, or a Resend API key. */
export type SavedEmail =
  ({ provider: "smtp" } & SmtpServer) | { provider: "resend"; apiKey: string };

/** Where the way of sending was set: the server's environment, or Settings → Email. */
export type EmailSource = "server" | "settings";

export interface EmailChoice {
  adapter: EmailAdapter | null;
  /** Why the chosen provider cannot be used, in words safe to show an admin. */
  problem: string | null;
  /** Where it was set, or `null` when it is not set anywhere. */
  source: EmailSource | null;
}

const UNREADABLE_URL =
  "SMTP_URL could not be read. Use SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASSWORD instead, which take the values as they are.";

/** Whether the environment chooses how mail is sent, which then wins over Settings → Email. */
export function envChoosesEmail(env: EmailEnv): boolean {
  return Boolean(env.provider ?? env.smtpUrl ?? env.smtpHost);
}

/** An SMTP server made from plain values, or `null` when there is no host. */
function serverFromEnv(env: EmailEnv): SmtpServer | null {
  if (!env.smtpHost) return null;
  return {
    host: env.smtpHost,
    port: env.smtpPort ?? 587,
    user: env.smtpUser ?? "",
    password: env.smtpPassword ?? "",
  };
}

function smtp(server: string | SmtpServer, source: EmailSource, problem: string): EmailChoice {
  try {
    return { adapter: createSmtpAdapter(server), problem: null, source };
  } catch {
    return { adapter: null, problem, source };
  }
}

/**
 * The adapter to send with. The server's environment comes first; without it, the provider
 * saved in Settings → Email. A provider that is chosen but cannot be built is reported rather
 * than thrown, so a settings page can say what is wrong instead of failing. The problem never
 * repeats a password.
 */
export function chooseEmailAdapter(env: EmailEnv, saved: SavedEmail | null = null): EmailChoice {
  if (envChoosesEmail(env)) {
    if (env.provider === "resend") {
      return env.resendApiKey
        ? { adapter: createResendAdapter(env.resendApiKey), problem: null, source: "server" }
        : { adapter: null, problem: "RESEND_API_KEY is not set.", source: "server" };
    }
    const server = serverFromEnv(env);
    if (server) return smtp(server, "server", "SMTP_HOST or SMTP_PORT could not be used.");
    if (env.smtpUrl) return smtp(env.smtpUrl, "server", UNREADABLE_URL);
    return {
      adapter: null,
      problem: "EMAIL_PROVIDER is smtp, but SMTP_HOST is not set.",
      source: "server",
    };
  }
  if (saved?.provider === "resend") {
    return { adapter: createResendAdapter(saved.apiKey), problem: null, source: "settings" };
  }
  if (saved) {
    const { host, port, user, password } = saved;
    return smtp(
      { host, port, user, password },
      "settings",
      "The saved SMTP server could not be used.",
    );
  }
  return { adapter: null, problem: null, source: null };
}
