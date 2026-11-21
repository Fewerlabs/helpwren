import { z } from "zod";

/** The pair of keys that signs every web push this install sends. */
export const vapidKeysSchema = z.object({
  publicKey: z.string().min(1),
  privateKey: z.string().min(1),
});

export type VapidKeyPair = z.infer<typeof vapidKeysSchema>;

/** Where the keys are kept: one row, written once. */
export interface VapidKeyStore {
  read: () => Promise<unknown>;
  /** Adds the keys unless some are there already, which then stay as they are. */
  addIfMissing: (keys: VapidKeyPair) => Promise<void>;
}

export interface LoadVapidKeysOptions {
  store: VapidKeyStore;
  /** Keys from the environment, which win over stored ones when both halves are set. */
  fromEnv: { publicKey: string | undefined; privateKey: string | undefined };
  generate: () => VapidKeyPair;
}

/**
 * The install's VAPID keys: from the environment when it sets them, otherwise the ones kept in
 * the database, made the first time they are needed. Two servers making them at the same moment
 * end up with the same pair: whichever was kept first.
 */
export async function loadOrCreateVapidKeys({
  store,
  fromEnv,
  generate,
}: LoadVapidKeysOptions): Promise<VapidKeyPair> {
  if (fromEnv.publicKey && fromEnv.privateKey) {
    return { publicKey: fromEnv.publicKey, privateKey: fromEnv.privateKey };
  }
  const stored = vapidKeysSchema.safeParse(await store.read());
  if (stored.success) return stored.data;

  await store.addIfMissing(generate());
  const kept = vapidKeysSchema.safeParse(await store.read());
  if (!kept.success) throw new Error("The VAPID keys could not be kept.");
  return kept.data;
}
