import { z } from "zod";

import {
  ATTRIBUTES_MAX,
  IdentityError,
  verifiedIdentitySchema,
  type IdentityAdapter,
  type VerifiedIdentity,
} from "./types";

/** How long the host product has to answer before the visitor is told to try again. */
const TIMEOUT_MS = 5000;
/** The most of an answer that is read. A profile is small; anything larger is not one. */
const ANSWER_MAX_BYTES = 100_000;

/** Where a value sits in the answer, as names joined by dots: `data.user.id`. */
const pathSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]+)*$/);

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * The address must be HTTPS, because the user's own token is sent to it. Plain HTTP is allowed
 * only to this machine, for development.
 */
const endpointSchema = z.url().refine((value) => {
  const url = new URL(value);
  return url.protocol === "https:" || (url.protocol === "http:" && LOCAL_HOSTS.has(url.hostname));
});

export const profileEndpointConfigSchema = z.object({
  /** The host product's "who am I" address, which answers with JSON for a valid token. */
  url: endpointSchema,
  fields: z.object({
    /** The user's id. The only field every install must map. */
    id: pathSchema,
    /** One or more fields that make up the name, joined with spaces: first and last name. */
    name: z.array(pathSchema).max(4).default([]),
    email: pathSchema.optional(),
    orgId: pathSchema.optional(),
    orgName: pathSchema.optional(),
    audience: pathSchema.optional(),
  }),
  /**
   * What the product's values for the audience field mean here, such as `Business` meaning
   * `business`. A value that is not listed is used as it is.
   */
  audiences: z.record(z.string(), z.string().min(1)).default({}),
  /** Other fields to show the team: the name to show each under, and where it is. */
  attributes: z
    .record(z.string().min(1).max(100), pathSchema)
    .refine((attributes) => Object.keys(attributes).length <= ATTRIBUTES_MAX)
    .default({}),
});

export type ProfileEndpointConfig = z.infer<typeof profileEndpointConfigSchema>;

/** The value at a path in the answer, or `undefined` if any step of it is missing. */
function at(answer: unknown, path: string | undefined): unknown {
  if (path === undefined) return undefined;
  let value = answer;
  for (const key of path.split(".")) {
    if (typeof value !== "object" || value === null || !Object.hasOwn(value, key)) {
      return undefined;
    }
    value = (value as Record<string, unknown>)[key];
  }
  return value ?? undefined;
}

/** A value as text, when it is something a person could read as one. */
function text(value: unknown): string | undefined {
  if (typeof value === "number") return String(value);
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

async function ask(token: string, url: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { authorization: `Bearer ${token}`, accept: "application/json" },
      // Followed, a redirect would hand the user's token to wherever it pointed.
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (cause) {
    throw new IdentityError("unavailable", "The host product did not answer.", { cause });
  }

  // The product knows why it said no and this install does not. A token that has run out is
  // by far the usual reason, and the page can fetch another, so that is what it is told.
  if (response.status === 401) {
    throw new IdentityError("expired", "The host product did not accept the token.");
  }
  if (response.status === 403) {
    throw new IdentityError("rejected", "The host product refused this user.");
  }
  if (!response.ok) {
    throw new IdentityError(
      "unavailable",
      `The host product answered with status ${String(response.status)}.`,
    );
  }

  try {
    const body = await response.text();
    if (body.length > ANSWER_MAX_BYTES) throw new Error("The answer is too large.");
    return JSON.parse(body) as unknown;
  } catch (cause) {
    throw new IdentityError("unavailable", "The host product's answer could not be read.", {
      cause,
    });
  }
}

/**
 * The page hands over the token the user already has for the host product, and this install
 * asks the product whose it is: one call to its "who am I" address, with the token as the
 * product's own apps would send it. The product stays the only judge of who is logged in, and
 * needs no new code. The token is sent there and nowhere else, and is not kept.
 */
export const profileEndpoint: IdentityAdapter<ProfileEndpointConfig> = {
  async verify(token, config): Promise<VerifiedIdentity> {
    const answer = await ask(token, config.url);
    const { fields } = config;

    const name = fields.name
      .map((path) => text(at(answer, path)))
      .filter((part) => part !== undefined)
      .join(" ");
    const orgId = text(at(answer, fields.orgId));
    const audience = text(at(answer, fields.audience));
    const email = text(at(answer, fields.email));

    const identity = verifiedIdentitySchema.safeParse({
      externalId: text(at(answer, fields.id)),
      name: name === "" ? undefined : name,
      // An address the product has in a shape this install does not accept is left out, not
      // a reason to turn the user away.
      email: z.email().safeParse(email).success ? email : undefined,
      org: orgId === undefined ? undefined : { id: orgId, name: text(at(answer, fields.orgName)) },
      audience: audience === undefined ? undefined : (config.audiences[audience] ?? audience),
      attributes: Object.fromEntries(
        Object.entries(config.attributes)
          .map(([label, path]) => [label, at(answer, path)] as const)
          .filter(([, value]) => ["string", "number", "boolean"].includes(typeof value)),
      ),
    });
    if (!identity.success) {
      // The product accepted the token, so this is the mapping's fault, not the visitor's.
      throw new IdentityError(
        "unavailable",
        `The host product's answer has no usable value at "${fields.id}" for the user's id.`,
        { cause: identity.error },
      );
    }
    return identity.data;
  },
};
