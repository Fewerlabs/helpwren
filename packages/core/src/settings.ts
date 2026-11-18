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
 * Who the install is, wherever it appears: the widget, the chat page and the help center. Only
 * the name is needed; anything left out falls back to Helpwren's own look.
 */
const brandSchema = z.object({
  name: z.string().min(1),
  /** The address of the logo, shown in place of the wren. */
  logo: z.url().optional(),
  /** The colour of buttons and the visitor's own messages. */
  accent: accentColorSchema.optional(),
  /** A second colour. With it, large surfaces such as the launcher fade from `accent` to this. */
  accentTo: accentColorSchema.optional(),
});

export type Brand = z.infer<typeof brandSchema>;

export const widgetPositionSchema = z.enum(["right", "left"]);
export const widgetLauncherSchema = z.enum(["chat", "logo"]);

/** The most quick responses a chat offers, and the longest one may be. */
export const QUICK_REPLIES_MAX = 5;
export const QUICK_REPLY_MAX_LENGTH = 60;

/** How the chat looks and what it says, in the widget and on the chat page. */
const widgetSchema = z.object({
  /** The corner of the page the launcher sits in. */
  position: widgetPositionSchema.default("right"),
  /** How far the launcher sits from the side and the bottom of the page, in pixels. */
  offsetX: z.number().int().min(0).max(120).default(20),
  offsetY: z.number().int().min(0).max(120).default(20),
  /** What the launcher shows: a chat bubble, or the brand's logo when it has one. */
  launcher: widgetLauncherSchema.default("chat"),
  /** The first line of the home screen, in place of "Hi there." */
  greeting: z.string().min(1).optional(),
  /** The line under the greeting, in place of "How can we help?" */
  intro: z.string().min(1).optional(),
  /** A message from the team that opens every new conversation, before the visitor writes. */
  welcome: z.string().min(1).optional(),
  /** Replies the visitor can send with one tap, offered when a conversation starts. */
  quickReplies: z.array(z.string().min(1)).max(QUICK_REPLIES_MAX).default([]),
});

export type WidgetSettings = z.infer<typeof widgetSchema>;

/** What the chat page and the help center say at the top, in place of the usual wording. */
const pageTextSchema = z.object({
  title: z.string().min(1).optional(),
  intro: z.string().min(1).optional(),
});

export type PageText = z.infer<typeof pageTextSchema>;

const storedSettingsSchema = z.object({
  brand: brandSchema.default({ name: "Helpwren" }),
  widget: widgetSchema.default(() => widgetSchema.parse({})),
  /** The chat on a page of its own, at `/chat`, for a link in an email or a profile. */
  chat_page: pageTextSchema.default({}),
  help_center: pageTextSchema.default({}),
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
  widget: stored.widget,
  chatPage: stored.chat_page,
  helpCenter: stored.help_center,
  guestDetails: stored.guest_details,
  allowedDomains: stored.allowed_domains,
  sources: stored.sources,
}));

export type Settings = z.infer<typeof settingsSchema>;

/** The settings anyone may read, including a visitor with no session. */
export type PublicSettings = Pick<
  Settings,
  "brand" | "widget" | "chatPage" | "helpCenter" | "guestDetails"
>;

/** For checking settings that arrive from somewhere other than the database, such as a preview. */
export const publicSettingsSchema = z.object({
  brand: brandSchema,
  widget: widgetSchema,
  chatPage: pageTextSchema,
  helpCenter: pageTextSchema,
  guestDetails: guestDetailsSchema,
});

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
  const { brand, widget, chatPage, helpCenter, guestDetails } = parseSettings(rows);
  return { brand, widget, chatPage, helpCenter, guestDetails };
}

const pageTextPatchSchema = z.object({
  title: z.string().trim().min(1).max(80).optional(),
  intro: z.string().trim().min(1).max(200).optional(),
});

/** The settings an admin can change, with the same rules as when they are read. */
export const settingsPatchSchema = z
  .object({
    // Each of these is saved whole: a part left out goes back to its default.
    brand: z.object({
      name: z.string().trim().min(1).max(60),
      logo: z.url().max(2000).optional(),
      accent: accentColorSchema.optional(),
      accentTo: accentColorSchema.optional(),
    }),
    widget: z.object({
      position: widgetPositionSchema,
      offsetX: z.number().int().min(0).max(120),
      offsetY: z.number().int().min(0).max(120),
      launcher: widgetLauncherSchema,
      greeting: z.string().trim().min(1).max(60).optional(),
      intro: z.string().trim().min(1).max(80).optional(),
      welcome: z.string().trim().min(1).max(500).optional(),
      quickReplies: z
        .array(z.string().trim().min(1).max(QUICK_REPLY_MAX_LENGTH))
        .max(QUICK_REPLIES_MAX),
    }),
    chatPage: pageTextPatchSchema,
    helpCenter: pageTextPatchSchema,
    guestDetails: guestDetailsSchema,
    allowedDomains: z.array(allowedDomainSchema).max(50),
  })
  .partial();

export type SettingsPatch = z.input<typeof settingsPatchSchema>;

export type UpdateSettingsResult = { ok: true } | { ok: false; reason: "forbidden" };

/** Where logos are kept, and what one may be. The bucket enforces the same limits. */
const LOGO_BUCKET = "brand";
export const LOGO_MAX_BYTES = 1024 * 1024;
export const LOGO_TYPES = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
} as const;

export type UploadLogoResult =
  { ok: true; url: string } | { ok: false; reason: "forbidden" | "too_large" | "unsupported" };

/** Where each setting is stored, and whether a visitor with no session may read it. */
const storage = {
  brand: { key: "brand", isPublic: true },
  widget: { key: "widget", isPublic: true },
  chatPage: { key: "chat_page", isPublic: true },
  helpCenter: { key: "help_center", isPublic: true },
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

    /**
     * Stores a logo and gives back its public address, to save as `brand.logo`. Only an admin
     * may. Each upload gets a new address, so a changed logo is never served from a cache.
     */
    async uploadLogo(file: Blob): Promise<UploadLogoResult> {
      const extension = (LOGO_TYPES as Record<string, string | undefined>)[file.type];
      if (!extension) return { ok: false, reason: "unsupported" };
      if (file.size > LOGO_MAX_BYTES) return { ok: false, reason: "too_large" };

      const path = `logo-${crypto.randomUUID()}.${extension}`;
      const bucket = supabase.storage.from(LOGO_BUCKET);
      const { error } = await bucket.upload(path, file, {
        contentType: file.type,
        cacheControl: "31536000",
      });
      if (error) {
        // Storage reports a refusal by the access rules as a 403.
        if ("statusCode" in error && String(error.statusCode) === "403") {
          return { ok: false, reason: "forbidden" };
        }
        throw new HelpwrenError("Could not store the logo.", { cause: error });
      }
      return { ok: true, url: bucket.getPublicUrl(path).data.publicUrl };
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
