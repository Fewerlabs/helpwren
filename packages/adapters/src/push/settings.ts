import { z } from "zod";

/**
 * How this install reaches people on their phones, as stored in its `push` setting. `none`
 * sends nothing. The Expo access token, when the project needs one, is kept with the secrets.
 */
export const pushSettingsSchema = z.object({ provider: z.enum(["none", "expo"]) });

export type PushSettings = z.infer<typeof pushSettingsSchema>;
