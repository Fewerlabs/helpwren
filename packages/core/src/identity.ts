import { z } from "zod";

/** What the chat sends to be signed in as one of the host product's users. */
export const identifyInputSchema = z.object({
  /** The token the host page handed over. What it is depends on the install's identity setting. */
  token: z.string().min(1).max(8000),
});

export type IdentifyInput = z.infer<typeof identifyInputSchema>;

/** A session for the user the token belongs to, for the chat to load in place of its own. */
export const identifyResponseSchema = z.object({
  userId: z.uuid(),
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  /** How many conversations the visitor had as a guest that are now this user's. */
  mergedConversations: z.number().int().min(0),
});

export type IdentifyResponse = z.infer<typeof identifyResponseSchema>;
