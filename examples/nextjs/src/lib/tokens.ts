import { randomUUID } from "node:crypto";

import { errors, jwtVerify, SignJWT } from "jose";

import { type GlownUser } from "./users";

/**
 * Tokens the way Glown's API makes them: HS256 with one shared secret, carrying the user's id,
 * type and email, a fresh `jti` and a short life. Helpwren never sees this secret. It asks
 * `/api/me` whose a token is (the profile endpoint), which is why HS256 is fine here.
 */
const SECRET = new TextEncoder().encode(
  process.env.GLOWN_JWT_SECRET ?? "glown-example-secret-for-local-use-only",
);
/** How long an access token lasts, in seconds. Glown's is set the same way. */
const ACCESS_SECONDS = Number(process.env.JWT_EXPIRATION_IN_SECONDS ?? 900);
const REFRESH_SECONDS = 90 * 24 * 60 * 60;

export interface AccessClaims {
  userId: string;
  type: string;
  email: string;
}

export function signAccessToken(user: GlownUser): Promise<string> {
  return new SignJWT({ userId: user.id, type: user.type, email: user.email, av: 0 })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_SECONDS}s`)
    .sign(SECRET);
}

export function signRefreshToken(user: GlownUser): Promise<string> {
  return new SignJWT({ userId: user.id, purpose: "refresh" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setJti(randomUUID())
    .setExpirationTime(`${REFRESH_SECONDS}s`)
    .sign(SECRET);
}

export type Verified<Claims> = { ok: true; claims: Claims } | { ok: false; expired: boolean };

async function verify(token: string): Promise<Verified<Record<string, unknown>>> {
  try {
    const { payload } = await jwtVerify(token, SECRET, { algorithms: ["HS256"] });
    return { ok: true, claims: payload };
  } catch (error) {
    return { ok: false, expired: error instanceof errors.JWTExpired };
  }
}

export async function verifyAccessToken(token: string): Promise<Verified<AccessClaims>> {
  const result = await verify(token);
  if (!result.ok) return result;
  const { userId, type, email, purpose } = result.claims;
  if (typeof userId !== "string" || typeof type !== "string" || typeof email !== "string") {
    return { ok: false, expired: false };
  }
  // A refresh token is not an access token, though the same secret signs both.
  if (purpose !== undefined) return { ok: false, expired: false };
  return { ok: true, claims: { userId, type, email } };
}

/** The user a refresh token is for, or `null` when it is not a good one. */
export async function refreshTokenUser(token: string): Promise<string | null> {
  const result = await verify(token);
  if (!result.ok || result.claims.purpose !== "refresh") return null;
  return typeof result.claims.userId === "string" ? result.claims.userId : null;
}
