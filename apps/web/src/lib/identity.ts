import "server-only";

import { randomBytes } from "node:crypto";

import {
  identitySettingsSchema,
  profileEndpoint,
  signedToken,
  signingKeySchema,
  type IdentitySettings,
  type SigningKey,
  type VerifiedIdentity,
} from "@helpwren/adapters";
import { z } from "zod";

import { supabaseAdmin } from "@/lib/supabase/admin";

/** The setting that says how this install learns who a visitor is. */
export const IDENTITY_SETTING = "identity";
/** The secret holding the keys that identity tokens are signed with. */
export const IDENTITY_KEYS_SECRET = "identity_keys";
/** Two, so a key can be replaced while tokens signed with the old one are still accepted. */
export const SIGNING_KEYS_MAX = 2;

const storedKeySchema = signingKeySchema.extend({ createdAt: z.iso.datetime().optional() });
type StoredKey = z.infer<typeof storedKeySchema>;

async function stored(table: "settings" | "secrets", key: string): Promise<unknown> {
  const { data, error } = await supabaseAdmin
    .from(table)
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error) throw error;
  return data?.value;
}

/** How this install identifies its users. Guests only, until an admin says otherwise. */
export async function getIdentitySettings(): Promise<IdentitySettings> {
  return identitySettingsSchema.parse(
    (await stored("settings", IDENTITY_SETTING)) ?? { mode: "none" },
  );
}

/** Only for a caller that has checked the person asking is an admin. */
export async function saveIdentitySettings(settings: IdentitySettings): Promise<void> {
  const { error } = await supabaseAdmin
    .from("settings")
    .upsert({ key: IDENTITY_SETTING, value: settings, is_public: false });
  if (error) throw error;
}

async function getSigningKeys(): Promise<StoredKey[]> {
  return z.array(storedKeySchema).parse((await stored("secrets", IDENTITY_KEYS_SECRET)) ?? []);
}

async function saveSigningKeys(keys: StoredKey[]): Promise<void> {
  const { error } = await supabaseAdmin
    .from("secrets")
    .upsert({ key: IDENTITY_KEYS_SECRET, value: keys });
  if (error) throw error;
}

/** A signing key as a settings screen may show it: never the secret itself. */
export interface SigningKeySummary {
  id: string;
  createdAt: string | null;
}

export async function listSigningKeys(): Promise<SigningKeySummary[]> {
  return (await getSigningKeys()).map(({ id, createdAt }) => ({
    id,
    createdAt: createdAt ?? null,
  }));
}

/**
 * Makes a new signing key and returns it whole, once: this is the only time its secret leaves
 * the server. Returns `null` when there are already as many keys as may be in use.
 */
export async function createSigningKey(): Promise<SigningKey | null> {
  const keys = await getSigningKeys();
  if (keys.length >= SIGNING_KEYS_MAX) return null;

  const key = {
    id: `key_${randomBytes(4).toString("hex")}`,
    secret: randomBytes(32).toString("base64url"),
  };
  await saveSigningKeys([...keys, { ...key, createdAt: new Date().toISOString() }]);
  return key;
}

/** Tokens signed with a removed key stop being accepted at once. */
export async function removeSigningKey(id: string): Promise<void> {
  const keys = await getSigningKeys();
  await saveSigningKeys(keys.filter((key) => key.id !== id));
}

/**
 * Confirms who a token belongs to, in the way this install is set up to. Returns `null` when
 * the install does not identify anyone, and throws an `IdentityError` when the token is not
 * accepted. The token is used for this and not kept.
 */
export async function verifyIdentity(token: string): Promise<VerifiedIdentity | null> {
  const settings = await getIdentitySettings();
  if (settings.mode === "none") return null;
  if (settings.mode === "profile_endpoint") return profileEndpoint.verify(token, settings.endpoint);

  const keys = (await getSigningKeys()).map(({ id, secret }) => ({ id, secret }));
  // With no key made yet, nothing could have signed a token this install accepts.
  if (keys.length === 0) return null;
  return signedToken.verify(token, { keys });
}
