import { z } from "zod";

import { HelpwrenError } from "./errors";
import { type HelpwrenSupabaseClient } from "./supabase";

/**
 * The settings anyone may read, including a visitor with no session. Each key is one row of
 * the `settings` table marked public; a missing row falls back to its default.
 */
export const publicSettingsSchema = z.object({
  brand: z.object({ name: z.string().min(1) }).default({ name: "Helpwren" }),
});

export type PublicSettings = z.infer<typeof publicSettingsSchema>;

/** Turns `settings` rows into one validated object, ignoring keys this version does not know. */
export function parsePublicSettings(rows: readonly { key: string; value: unknown }[]) {
  const settings = publicSettingsSchema.safeParse(
    Object.fromEntries(rows.map((row) => [row.key, row.value])),
  );
  if (!settings.success) {
    throw new HelpwrenError(`Invalid public settings:\n${z.prettifyError(settings.error)}`, {
      cause: settings.error,
    });
  }
  return settings.data;
}

export function createSettings(supabase: HelpwrenSupabaseClient) {
  return {
    async getPublic(): Promise<PublicSettings> {
      const { data, error } = await supabase
        .from("settings")
        .select("key, value")
        .eq("is_public", true);

      if (error) throw new HelpwrenError("Could not load the settings.", { cause: error });
      return parsePublicSettings(data);
    },
  };
}

export type SettingsApi = ReturnType<typeof createSettings>;
