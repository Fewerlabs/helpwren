import { z } from "zod";

import { profileEndpointConfigSchema } from "./profile-endpoint";

export {
  endpointUrlSchema,
  fieldPathSchema,
  profileEndpointConfigSchema,
  type ProfileEndpointConfig,
} from "./profile-endpoint";
export { type VerifiedIdentity } from "./types";

/**
 * How this install learns who a visitor is, as stored in its `identity` setting. `none` means
 * everyone chats as a guest. Secrets are not part of it: they are kept where only the server
 * can read them.
 */
export const identitySettingsSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("none") }),
  z.object({ mode: z.literal("signed_token") }),
  z.object({ mode: z.literal("profile_endpoint"), endpoint: profileEndpointConfigSchema }),
]);

export type IdentitySettings = z.infer<typeof identitySettingsSchema>;
export type IdentityMode = IdentitySettings["mode"];
export { pushSettingsSchema, type PushSettings } from "../push/settings";
export { serviceAccountSchema, type ServiceAccount } from "../push/fcm";
