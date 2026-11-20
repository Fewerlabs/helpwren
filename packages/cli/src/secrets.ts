import { createHmac, randomBytes } from "node:crypto";

/** A random value as hex: `bytes` of randomness from the operating system. */
export const randomHex = (bytes: number) => randomBytes(bytes).toString("hex");

const base64url = (input: string | Buffer) => Buffer.from(input).toString("base64url");

/**
 * A long-lived API key for self-hosted Supabase: a JWT for a database role, signed with the
 * project's JWT secret. The same shape Supabase's own `utils/generate-keys.sh` makes.
 */
export function supabaseRoleKey(
  role: "anon" | "service_role",
  jwtSecret: string,
  now = new Date(),
): string {
  const issuedAt = Math.floor(now.getTime() / 1000);
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64url(
    JSON.stringify({ role, iss: "supabase", iat: issuedAt, exp: issuedAt + 5 * 365 * 24 * 3600 }),
  );
  const signature = createHmac("sha256", jwtSecret).update(`${header}.${payload}`).digest();
  return `${header}.${payload}.${base64url(signature)}`;
}

/**
 * Every secret a self-hosted Supabase needs, freshly made. Mirrors the list in Supabase's
 * `utils/generate-keys.sh` at the pinned version, so nothing is left at its published example.
 */
export function selfHostedSecrets(): Record<string, string> {
  const jwtSecret = randomBytes(30).toString("base64");
  return {
    POSTGRES_PASSWORD: randomHex(16),
    JWT_SECRET: jwtSecret,
    ANON_KEY: supabaseRoleKey("anon", jwtSecret),
    SERVICE_ROLE_KEY: supabaseRoleKey("service_role", jwtSecret),
    DASHBOARD_PASSWORD: randomHex(16),
    SECRET_KEY_BASE: randomBytes(48).toString("base64"),
    REALTIME_DB_ENC_KEY: randomHex(8),
    VAULT_ENC_KEY: randomHex(16),
    PG_META_CRYPTO_KEY: randomBytes(24).toString("base64"),
    LOGFLARE_PUBLIC_ACCESS_TOKEN: randomBytes(24).toString("base64"),
    LOGFLARE_PRIVATE_ACCESS_TOKEN: randomBytes(24).toString("base64"),
    S3_PROTOCOL_ACCESS_KEY_ID: randomHex(16),
    S3_PROTOCOL_ACCESS_KEY_SECRET: randomHex(32),
    MINIO_ROOT_PASSWORD: randomHex(16),
    POOLER_TENANT_ID: `helpwren-${randomHex(4)}`,
  };
}
