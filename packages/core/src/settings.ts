import { z } from "zod";

import { HelpwrenError } from "./errors";
import { type HelpwrenSupabaseClient } from "./supabase";

/** What a guest is asked for, with their name, before their first message. */
export const guestDetailsSchema = z.enum(["email", "phone", "email_or_phone", "none"]);
export type GuestDetails = z.infer<typeof guestDetailsSchema>;

/**
 * Every setting, as stored: one row of the `settings` table per key. A missing row falls back
 * to its default, and keys this version does not know are ignored.
 */
const storedSettingsSchema = z.object({
  brand: z.object({ name: z.string().min(1) }).default({ name: "Helpwren" }),
  guest_details: guestDetailsSchema.default("email"),
  /** The country a phone field starts on, as a two-letter code. Nigeria (+234) unless set. */
  default_country: z
    .string()
    .regex(/^[A-Za-z]{2}$/)
    .transform((code) => code.toUpperCase())
    .default("NG"),
  /**
   * The sites that may show the chat in a frame, as hosts such as `example.com` or
   * `*.example.com`. Empty means any site, so a new install works before it is configured.
   */
  allowed_domains: z.array(z.string().min(1)).default([]),
  /** Where a conversation may come from, such as the website or a mobile app. */
  sources: z.array(z.string().min(1)).min(1).default(["web"]),
});

export const settingsSchema = storedSettingsSchema.transform((stored) => ({
  brand: stored.brand,
  guestDetails: stored.guest_details,
  defaultCountry: stored.default_country,
  allowedDomains: stored.allowed_domains,
  sources: stored.sources,
}));

export type Settings = z.infer<typeof settingsSchema>;

/** The settings anyone may read, including a visitor with no session. */
export type PublicSettings = Pick<Settings, "brand" | "guestDetails" | "defaultCountry">;

interface SettingRow {
  key: string;
  value: unknown;
}

/** Turns `settings` rows into one validated object. */
export function parseSettings(rows: readonly SettingRow[]): Settings {
  const settings = settingsSchema.safeParse(
    Object.fromEntries(rows.map((row) => [row.key, row.value])),
  );
  if (!settings.success) {
    throw new HelpwrenError(`Invalid settings:\n${z.prettifyError(settings.error)}`, {
      cause: settings.error,
    });
  }
  return settings.data;
}

export function parsePublicSettings(rows: readonly SettingRow[]): PublicSettings {
  const { brand, guestDetails, defaultCountry } = parseSettings(rows);
  return { brand, guestDetails, defaultCountry };
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
