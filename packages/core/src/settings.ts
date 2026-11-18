import { z } from "zod";

import { HelpwrenError } from "./errors";
import { type HelpwrenSupabaseClient } from "./supabase";

/** What a guest is asked for, with their name, before their first message. */
export const guestDetailsSchema = z.enum(["email", "phone", "email_or_phone", "none"]);
export type GuestDetails = z.infer<typeof guestDetailsSchema>;

/** A site that may show the chat: a host such as `example.com`, `*.example.com` or `localhost:4100`. */
export const allowedDomainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^(\*\.)?[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*(:\d{1,5})?$/);

/**
 * Every setting, as stored: one row of the `settings` table per key. A missing row falls back
 * to its default, and keys this version does not know are ignored.
 */
/** A colour as six hex digits, such as `#2f6f4f`. */
export const accentColorSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^#[0-9a-f]{6}$/);

/**
 * How the install presents itself to visitors. Only the name is needed; anything left out
 * falls back to Helpwren's own colour and wording.
 */
const brandSchema = z.object({
  name: z.string().min(1),
  /** The colour of the chat's buttons and the visitor's own messages. */
  accent: accentColorSchema.optional(),
  /** The first line of the chat's home screen, in place of "Hi there." */
  greeting: z.string().min(1).optional(),
  /** The line under the greeting, in place of "How can we help?" */
  intro: z.string().min(1).optional(),
});

export type Brand = z.infer<typeof brandSchema>;

const storedSettingsSchema = z.object({
  brand: brandSchema.default({ name: "Helpwren" }),
  guest_details: guestDetailsSchema.default("email"),
  /**
   * The sites that may show the chat in a frame, as hosts such as `example.com` or
   * `*.example.com`. Empty means any site, so a new install works before it is configured.
   */
  allowed_domains: z.array(allowedDomainSchema).default([]),
  /** Where a conversation may come from, such as the website or a mobile app. */
  sources: z.array(z.string().min(1)).min(1).default(["web"]),
});

export const settingsSchema = storedSettingsSchema.transform((stored) => ({
  brand: stored.brand,
  guestDetails: stored.guest_details,
  allowedDomains: stored.allowed_domains,
  sources: stored.sources,
}));

export type Settings = z.infer<typeof settingsSchema>;

/** The settings anyone may read, including a visitor with no session. */
export type PublicSettings = Pick<Settings, "brand" | "guestDetails">;

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
  const { brand, guestDetails } = parseSettings(rows);
  return { brand, guestDetails };
}

/** The settings an admin can change, with the same rules as when they are read. */
export const settingsPatchSchema = z
  .object({
    // The whole brand is saved at once: a part left out goes back to its default.
    brand: z.object({
      name: z.string().trim().min(1).max(60),
      accent: accentColorSchema.optional(),
      greeting: z.string().trim().min(1).max(60).optional(),
      intro: z.string().trim().min(1).max(80).optional(),
    }),
    guestDetails: guestDetailsSchema,
    allowedDomains: z.array(allowedDomainSchema).max(50),
  })
  .partial();

export type SettingsPatch = z.input<typeof settingsPatchSchema>;

export type UpdateSettingsResult = { ok: true } | { ok: false; reason: "forbidden" };

/** Where each setting is stored, and whether a visitor with no session may read it. */
const storage = {
  brand: { key: "brand", isPublic: true },
  guestDetails: { key: "guest_details", isPublic: true },
  allowedDomains: { key: "allowed_domains", isPublic: false },
} as const satisfies Record<keyof SettingsPatch, { key: string; isPublic: boolean }>;

/** Postgres's error code for an action the access rules do not allow. */
const NOT_ALLOWED = "42501";

export function createSettings(supabase: HelpwrenSupabaseClient) {
  return {
    /** Every setting. For team members; a visitor gets the defaults for anything not public. */
    async getAll(): Promise<Settings> {
      const { data, error } = await supabase.from("settings").select("key, value");
      if (error) throw new HelpwrenError("Could not load the settings.", { cause: error });
      return parseSettings(data);
    },

    /** Changes the settings given, leaving the rest alone. Only an admin may. */
    async update(patch: SettingsPatch): Promise<UpdateSettingsResult> {
      const changes = settingsPatchSchema.parse(patch);
      const rows = (Object.keys(changes) as (keyof typeof changes)[]).flatMap((name) => {
        const value = changes[name];
        return value === undefined
          ? []
          : [{ key: storage[name].key, value, is_public: storage[name].isPublic }];
      });
      if (rows.length === 0) return { ok: true };

      const { error } = await supabase.from("settings").upsert(rows);
      if (error) {
        if (error.code === NOT_ALLOWED) return { ok: false, reason: "forbidden" };
        throw new HelpwrenError("Could not save the settings.", { cause: error });
      }
      return { ok: true };
    },

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
