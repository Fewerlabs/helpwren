import "server-only";

import {
  identitySettingsSchema,
  signedToken,
  signedTokenConfigSchema,
  type VerifiedIdentity,
} from "@helpwren/adapters";

import { supabaseAdmin } from "@/lib/supabase/admin";

/** The setting that says how this install learns who a visitor is. */
export const IDENTITY_SETTING = "identity";
/** The secret holding the keys that identity tokens are signed with. */
export const IDENTITY_KEYS_SECRET = "identity_keys";

async function stored(table: "settings" | "secrets", key: string): Promise<unknown> {
  const { data, error } = await supabaseAdmin
    .from(table)
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error) throw error;
  return data?.value;
}

/**
 * Confirms who a token belongs to, in the way this install is set up to. Returns `null` when
 * the install does not identify anyone, and throws an `IdentityError` when the token is not
 * accepted. The token is used for this and not kept.
 */
export async function verifyIdentity(token: string): Promise<VerifiedIdentity | null> {
  const settings = identitySettingsSchema.parse(
    (await stored("settings", IDENTITY_SETTING)) ?? { mode: "none" },
  );
  if (settings.mode === "none") return null;

  const keys = await stored("secrets", IDENTITY_KEYS_SECRET);
  return signedToken.verify(token, signedTokenConfigSchema.parse({ keys }));
}
