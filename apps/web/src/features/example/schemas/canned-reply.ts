import { z } from "zod";

/** A saved reply that an agent can insert into a conversation by typing its shortcut. */
export const cannedReplySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(60),
  shortcut: z.string().regex(/^[a-z0-9-]+$/),
  body: z.string().min(1).max(500),
  createdAt: z.iso.datetime(),
});

/** What the form collects. The messages are what a person sees under the field. */
export const newCannedReplySchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Give the reply a title.")
    .max(60, "Keep the title under 60 characters."),
  shortcut: z
    .string()
    .trim()
    .min(1, "Choose a shortcut.")
    .max(24, "Keep the shortcut under 24 characters.")
    .regex(/^[a-z0-9-]+$/, "Use lower-case letters, numbers and hyphens only."),
  body: z
    .string()
    .trim()
    .min(1, "Write the reply.")
    .max(500, "Keep the reply under 500 characters."),
});

/** One page of the list, as the API returns it. */
export const cannedReplyPageSchema = z.object({
  items: z.array(cannedReplySchema),
  nextCursor: z.number().int().optional(),
  total: z.number().int().nonnegative(),
});

// Types are inferred from the schemas, never written a second time.
export type CannedReply = z.infer<typeof cannedReplySchema>;
export type NewCannedReply = z.infer<typeof newCannedReplySchema>;
export type CannedReplyPage = z.infer<typeof cannedReplyPageSchema>;
