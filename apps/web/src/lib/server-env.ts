import "server-only";

import { z } from "zod";

/**
 * Environment variables only the server may read. They live apart from `env.ts` so that
 * importing this file from browser code fails the build instead of leaking a secret.
 */
const serverEnvSchema = z.object({
  /** Supabase's secret key. It bypasses the access rules, so it never leaves the server. */
  SUPABASE_SECRET_KEY: z.string().min(1),
});

function parseServerEnv(source: Record<string, string | undefined>) {
  const result = serverEnvSchema.safeParse(source);
  if (!result.success) {
    throw new Error(`Invalid environment variables:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

export const serverEnv = parseServerEnv({
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
});
