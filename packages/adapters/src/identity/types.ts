import { z } from "zod";

/** The most custom attributes one person may carry. */
export const ATTRIBUTES_MAX = 50;

const attributeValueSchema = z.union([z.string().max(500), z.number(), z.boolean(), z.null()]);

/**
 * Who someone is, once the host product has confirmed it. Every identity adapter ends here,
 * however it got there. Only the id is needed; the rest is whatever the product chose to say.
 */
export const verifiedIdentitySchema = z.object({
  /** The host product's own id for this person. It decides which history they see. */
  externalId: z.string().min(1).max(200),
  name: z.string().trim().min(1).max(200).optional(),
  email: z.email().max(320).optional(),
  /** The organisation they belong to. People in the same one share their conversations. */
  org: z
    .object({
      id: z.string().min(1).max(200),
      name: z.string().trim().min(1).max(200).optional(),
    })
    .optional(),
  /** One of the install's audiences, such as `customer` or `business`. */
  audience: z.string().min(1).max(100).optional(),
  /** Anything else worth showing the team beside the conversation. */
  attributes: z
    .record(z.string().min(1).max(100), attributeValueSchema)
    .refine((attributes) => Object.keys(attributes).length <= ATTRIBUTES_MAX)
    .default({}),
});

export type VerifiedIdentity = z.infer<typeof verifiedIdentitySchema>;

/**
 * Why a token was turned away. `rejected`: it is not one this install accepts. `expired`: it
 * was, and the page should fetch a fresh one. `unavailable`: it could not be checked just now.
 */
export type IdentityFailure = "rejected" | "expired" | "unavailable";

/** Thrown by an adapter that could not confirm who a token belongs to. */
export class IdentityError extends Error {
  readonly reason: IdentityFailure;

  constructor(reason: IdentityFailure, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "IdentityError";
    this.reason = reason;
  }
}

/**
 * One way of confirming who a visitor is with the host product. An adapter is given the token
 * the page handed over and the install's settings for it, and either says who that is or
 * throws an `IdentityError`. It runs on the server only, and must not keep the token.
 */
export interface IdentityAdapter<Config> {
  verify: (token: string, config: Config) => Promise<VerifiedIdentity>;
}
