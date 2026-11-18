import { decodeProtectedHeader, errors, jwtVerify, type JWTPayload } from "jose";
import { z } from "zod";

import {
  IdentityError,
  verifiedIdentitySchema,
  type IdentityAdapter,
  type VerifiedIdentity,
} from "./types";

/**
 * The longest a token may live. A token is as good as a password until it expires, so one
 * signed to last for months would defeat the point of signing a fresh one for each visit.
 */
export const TOKEN_MAX_LIFETIME_SECONDS = 24 * 60 * 60;

const ALGORITHM = "HS256";
/** How far the host product's clock may be from ours. */
const CLOCK_TOLERANCE_SECONDS = 60;

/** A secret the host product's server signs tokens with. Two may be in use while one is replaced. */
export const signingKeySchema = z.object({
  id: z.string().min(1),
  secret: z.string().min(32),
});

export type SigningKey = z.infer<typeof signingKeySchema>;

export const signedTokenConfigSchema = z.object({
  keys: z.array(signingKeySchema).min(1).max(2),
});

export type SignedTokenConfig = z.infer<typeof signedTokenConfigSchema>;

/**
 * The user's id. `sub` is the standard place for it; `user_id` is accepted too, since that is
 * what other support tools call it.
 */
function subjectOf(payload: JWTPayload): unknown {
  if (payload.sub !== undefined) return payload.sub;
  const userId = payload.user_id;
  return typeof userId === "number" ? String(userId) : userId;
}

function candidates(token: string, keys: readonly SigningKey[]): readonly SigningKey[] {
  let header;
  try {
    header = decodeProtectedHeader(token);
  } catch (cause) {
    throw new IdentityError("rejected", "The token is not a signed token.", { cause });
  }
  // The algorithm is checked again when the signature is; this only gives a clearer reason.
  if (header.alg !== ALGORITHM) {
    throw new IdentityError("rejected", `The token must be signed with ${ALGORITHM}.`);
  }
  // A token that names its key is checked against that one. One that does not is checked
  // against each, which is at most two.
  if (header.kid === undefined) return keys;
  return keys.filter((key) => key.id === header.kid);
}

async function payloadOf(token: string, keys: readonly SigningKey[]): Promise<JWTPayload> {
  let failure: unknown;
  for (const key of keys) {
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(key.secret), {
        algorithms: [ALGORITHM],
        requiredClaims: ["exp"],
        clockTolerance: CLOCK_TOLERANCE_SECONDS,
      });
      return payload;
    } catch (cause) {
      if (cause instanceof errors.JWTExpired) {
        throw new IdentityError("expired", "The token has expired.", { cause });
      }
      failure = cause;
    }
  }
  throw new IdentityError("rejected", "The token was not signed with one of this install's keys.", {
    cause: failure,
  });
}

/**
 * The host product's server signs a short-lived token saying who the visitor is, with a secret
 * from this install's settings. This is how Intercom, Zendesk and Featurebase do it, so it
 * suits any product with a backend. Whatever the token says is trusted, because only someone
 * holding the secret could have said it.
 */
export const signedToken: IdentityAdapter<SignedTokenConfig> = {
  async verify(token, config): Promise<VerifiedIdentity> {
    const payload = await payloadOf(token, candidates(token, config.keys));

    const lifetime = (payload.exp ?? 0) - Math.floor(Date.now() / 1000);
    if (lifetime > TOKEN_MAX_LIFETIME_SECONDS + CLOCK_TOLERANCE_SECONDS) {
      throw new IdentityError("rejected", "The token expires too far ahead: at most a day.");
    }

    const identity = verifiedIdentitySchema.safeParse({
      externalId: subjectOf(payload),
      name: payload.name,
      email: payload.email,
      org: payload.org,
      audience: payload.audience,
      attributes: payload.attributes,
    });
    if (!identity.success) {
      throw new IdentityError("rejected", "The token's contents are not valid.", {
        cause: identity.error,
      });
    }
    return identity.data;
  },
};
