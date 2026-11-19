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
  SUPABASE_INTERNAL_URL: set(process.env.SUPABASE_INTERNAL_URL),
});
