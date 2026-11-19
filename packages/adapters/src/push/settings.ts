import { z } from "zod";

import { endpointUrlSchema } from "../identity/profile-endpoint";

const channelsSchema = z.object({
  /** Expo's push service, for apps built with Expo. */
  expo: z.boolean().default(false),
  /** Firebase Cloud Messaging, for native, Flutter and React Native Firebase apps. */
  fcm: z.boolean().default(false),
  /** The product's own backend, sent a signed request for each push. `null` when off. */
  webhook: z.object({ url: endpointUrlSchema }).nullable().default(null),
});

/**
 * How this install reaches people on their phones, as stored in its `push` setting. Any of the
 * channels can be on at once. The Expo access token, the Firebase service account and the
 * webhook's signing secret are kept with the other secrets, not here. The first version kept
 * one `provider`, which is still read.
 */
export const pushSettingsSchema = z.preprocess((stored) => {
  if (typeof stored === "object" && stored !== null && "provider" in stored) {
    return { expo: stored.provider === "expo" };
  }
  return stored;
}, channelsSchema);

export type PushSettings = z.infer<typeof channelsSchema>;
