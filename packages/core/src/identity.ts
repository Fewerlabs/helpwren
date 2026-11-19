import { z } from "zod";

/** What the chat sends to be signed in as one of the host product's users. */
export const identifyInputSchema = z.object({
  /** The token the host page handed over. What it is depends on the install's identity setting. */
  token: z.string().min(1).max(8000),
});

export type IdentifyInput = z.infer<typeof identifyInputSchema>;

export const identifyResponseSchema = z.object({
  userId: z.uuid(),
  /**
   * A session for the user the token belongs to, for the chat to load in place of its own.
   * `null` when the session the chat sent is already theirs, and there is nothing to change.
   */
  session: z.object({ accessToken: z.string().min(1), refreshToken: z.string().min(1) }).nullable(),
  /** How many conversations the visitor had as a guest that are now this user's. */
  mergedConversations: z.number().int().min(0),
});

export type IdentifyResponse = z.infer<typeof identifyResponseSchema>;

/**
 * Why the chat could not be signed in as a user. `expired`: the token was good once, and a
 * fresh one will work. `rejected`: this token never will. `off`: the install identifies nobody.
 * `unavailable`: the host product could not be asked just now.
 */
export type IdentifyFailure = "expired" | "rejected" | "off" | "unavailable";

export type IdentifyResult =
  | { ok: true; userId: string; mergedConversations: number }
  | { ok: false; reason: IdentifyFailure };

/**
 * The id the chat makes up for a browser and keeps in its own storage. It names a browser, not
 * a person, and proves nothing about who is using it.
 */
export const visitorIdSchema = z.string().regex(/^[A-Za-z0-9_-]{16,64}$/);

/** What a page may tell the team about where the visitor is: a few plain values, by name. */
export const CONTEXT_MAX_KEYS = 20;
export const pageContextSchema = z
  .record(
    z.string().min(1).max(60),
    z.union([z.string().max(500), z.number(), z.boolean(), z.null()]),
  )
  .refine((context) => Object.keys(context).length <= CONTEXT_MAX_KEYS);

export type PageContext = z.infer<typeof pageContextSchema>;
