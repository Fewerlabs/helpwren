import "server-only";

import { z } from "zod";

/**
 * Environment variables only the server may read. They live apart from `env.ts` so that
 * importing this file from browser code fails the build instead of leaking a secret.
 */
const serverEnvSchema = z.object({
  /** Supabase's secret key. It bypasses the access rules, so it never leaves the server. */
  SUPABASE_SECRET_KEY: z.string().min(1),
  /** How the install sends mail. Unset means it sends none. */
  EMAIL_PROVIDER: z.enum(["smtp", "resend"]).optional(),
  /** For `smtp`: the server and its sign-in, such as `smtps://user:password@host:465`. */
  SMTP_URL: z.string().min(1).optional(),
  /** For `resend`: an API key that may send. */
  RESEND_API_KEY: z.string().min(1).optional(),
  /**
   * What a scheduler must present to run the install's timed work, such as sending emails
   * that are due. Long and random. Unset means there is no scheduled work.
   */
  CRON_SECRET: z.string().min(16).optional(),
  /**
   * Where request counts are kept: `database` (the default) shares one count between every
   * copy of the app; `memory` keeps one per process, which suits a single server.
   */
  RATE_LIMIT_STORE: z.enum(["database", "memory"]).default("database"),
  /**
   * The header that holds the visitor's network address, as the proxy in front of the app sets
   * it. The last address in it is used: the one the nearest proxy saw. Behind Cloudflare, use
   * `cf-connecting-ip`.
   */
  CLIENT_IP_HEADER: z.string().min(1).default("x-forwarded-for"),
  /** Cloudflare Turnstile's secret key, for the captcha switched on in Settings → General. */
  TURNSTILE_SECRET_KEY: z.string().min(1).optional(),
  /**
   * Where the server reaches Supabase when that differs from the public address, such as
   * `http://kong:8000` beside a self-hosted Supabase in Docker. Unset means the public one.
   */
  SUPABASE_INTERNAL_URL: z.url().optional(),
});

function parseServerEnv(source: Record<string, string | undefined>) {
  const result = serverEnvSchema.safeParse(source);
  if (!result.success) {
    throw new Error(`Invalid environment variables:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

/** An empty value in an env file means "not set", not a provider with no name. */
const set = (value: string | undefined) => (value === "" ? undefined : value);

export const serverEnv = parseServerEnv({
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  EMAIL_PROVIDER: set(process.env.EMAIL_PROVIDER),
  SMTP_URL: set(process.env.SMTP_URL),
  RESEND_API_KEY: set(process.env.RESEND_API_KEY),
  CRON_SECRET: set(process.env.CRON_SECRET),
  RATE_LIMIT_STORE: set(process.env.RATE_LIMIT_STORE),
  CLIENT_IP_HEADER: set(process.env.CLIENT_IP_HEADER),
  TURNSTILE_SECRET_KEY: set(process.env.TURNSTILE_SECRET_KEY),
  SUPABASE_INTERNAL_URL: set(process.env.SUPABASE_INTERNAL_URL),
});
