import "server-only";

import { parseSettings, type Settings } from "@helpwren/core";

import { supabaseAdmin } from "@/lib/supabase/admin";

/** The install's settings, read with the secret key, for a route that acts on them. */
export async function installSettings(): Promise<Settings> {
  const { data, error } = await supabaseAdmin.from("settings").select("key, value");
  if (error) throw error;
  return parseSettings(data);
}
