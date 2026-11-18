import { z } from "zod";

/**
 * How this install learns who a visitor is, as stored in its `identity` setting. `none` means
 * everyone chats as a guest. Secrets are not part of it: they are kept where only the server
 * can read them.
 */
export const identitySettingsSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("none") }),
  z.object({ mode: z.literal("signed_token") }),
]);

export type IdentitySettings = z.infer<typeof identitySettingsSchema>;
