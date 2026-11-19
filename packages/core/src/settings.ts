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
  /** The brand's colour: the launcher, illustrations, and buttons unless they have their own. */
  accent: accentColorSchema.optional(),
  /** A colour for buttons and the visitor's own messages, when it is not the brand's colour. */
  button: accentColorSchema.optional(),
  /** A second colour. With it, large surfaces such as the launcher fade from `accent` to this. */
  accentTo: accentColorSchema.optional(),
  /**
   * `false` hides the small "Powered by Helpwren" in the chat and the help center. Left out,
   * it shows, so settings saved before this existed keep their credit.
   */
  poweredBy: z.boolean().optional(),
});

export type Brand = z.infer<typeof brandSchema>;

export const widgetPositionSchema = z.enum(["right", "left"]);
export const widgetLauncherSchema = z.enum(["chat", "logo", "wren"]);

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
  /** What the launcher shows: a chat bubble, one with the wren in it, or the brand's logo. */
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

/** The most links the help center's header and footer hold. */
export const HELP_HEADER_LINKS_MAX = 4;
export const HELP_FOOTER_LINKS_MAX = 6;

/** A link to somewhere on the web, or a path on the same site such as `/pricing`. */
const linkAddressSchema = z
  .string()
  .trim()
  .max(500)
  .regex(/^(https?:\/\/\S+|\/(?!\/)\S*|mailto:\S+)$/);

export const helpLinkSchema = z.object({
  label: z.string().trim().min(1).max(40),
  url: linkAddressSchema,
});
export type HelpLink = z.infer<typeof helpLinkSchema>;

/**
 * What fills the top of the help center: the page's own paper colour, the brand's colour or
 * gradient, or a picture.
 */
export const helpHeaderStyleSchema = z.enum(["plain", "brand", "image"]);
export type HelpHeaderStyle = z.infer<typeof helpHeaderStyleSchema>;

/** How the public help center looks and what it says. Everything has a default. */
const helpCenterSchema = z.object({
  /** The heading at the top, in place of "How can we help?" */
  title: z.string().min(1).optional(),
  /** The line under it. */
  intro: z.string().min(1).optional(),
  headerStyle: helpHeaderStyleSchema.default("brand"),
  /** The address of the picture behind the header, for the `image` style. */
  headerImage: z.url().optional(),
  /** The hint inside the search box, in place of "Search for articles". */
  searchPlaceholder: z.string().min(1).optional(),
  /** Links beside the logo, such as back to the main site. */
  headerLinks: z.array(helpLinkSchema).max(HELP_HEADER_LINKS_MAX).default([]),
  /** Links at the foot of every page, such as the terms and the privacy policy. */
  footerLinks: z.array(helpLinkSchema).max(HELP_FOOTER_LINKS_MAX).default([]),
  /** Whether help pages show the chat launcher, so a reader can ask when an article falls short. */
  showChat: z.boolean().default(true),
  /** The home page's title for search engines and browser tabs, in place of the usual one. */
  seoTitle: z.string().min(1).optional(),
  /** The home page's description for search engines. */
  seoDescription: z.string().min(1).optional(),
  /**
   * Where visitors reach the help center, when that is not this install's own address: for
   * example `https://example.com/help`, served through a rewrite. Search engines are told
   * this is the one true address of every page.
   */
  url: z.url().optional(),
});

export type HelpCenterSettings = z.infer<typeof helpCenterSchema>;

/** The chat on a page of its own, at `/chat`. Everything has a default. */
const chatPageSchema = z.object({
  /** The heading over the chat, in place of "Chat with {brand}". */
  title: z.string().min(1).optional(),
  /** The line under it. */
  intro: z.string().min(1).optional(),
  /** What fills the band behind the top of the page, as for the help center's header. */
  headerStyle: helpHeaderStyleSchema.default("brand"),
  /** The address of the picture behind it, for the `image` style. */
  headerImage: z.url().optional(),
});

export type ChatPageSettings = z.infer<typeof chatPageSchema>;

/** How tickets come in. */
const ticketsSchema = z.object({
  /** Whether a visitor can open a ticket themselves from the chat. */
  fromChat: z.boolean().default(true),
});

/** Where answers to the install's emails come in, and how. */
export const inboundProviderSchema = z.enum(["resend", "postmark", "generic"]);
export type InboundProvider = z.infer<typeof inboundProviderSchema>;

const inboundSchema = z.object({
  /** Contacts may answer an email from their mail app, into the same conversation. */
  enabled: z.boolean().default(false),
  /**
   * The address replies go to, such as `reply@support.example.com`. Each email adds a signed
   * part after a plus: `reply+<token>@support.example.com`.
   */
  address: z.email().optional(),
  provider: inboundProviderSchema.default("resend"),
});

export type InboundEmailSettings = z.infer<typeof inboundSchema>;

/** Who emails come from. The name falls back to the brand's. */
const emailSchema = z.object({
  fromName: z.string().min(1).optional(),
  fromAddress: z.email().optional(),
  /** Email a contact an agent's reply they have not read after a few minutes. */
  replies: z.boolean().default(true),
  /** Email a contact when the team changes their ticket's status. */
  status: z.boolean().default(true),
  inbound: inboundSchema.default(() => inboundSchema.parse({})),
});

export type EmailSettings = z.infer<typeof emailSchema>;

/**
 * Seeing who is on the site. Location comes from the hosting platform's headers, and visitors'
 * addresses are not stored.
 */
const visitorsSchema = z.object({
  /** The chat checks in while the page is open, and contacts get their browser's details. */
  tracking: z.boolean().default(true),
  /** The Visitors section of the dashboard, and starting a conversation from it. */
  liveList: z.boolean().default(true),
});

export type VisitorSettings = z.infer<typeof visitorsSchema>;

const visitorsDefault = { tracking: true, liveList: true };

const storedSettingsSchema = z.object({
  brand: brandSchema.default({ name: "Helpwren" }),
  widget: widgetSchema.default(() => widgetSchema.parse({})),
  /** The chat on a page of its own, at `/chat`, for a link in an email or a profile. */
  chat_page: chatPageSchema.default(() => chatPageSchema.parse({})),
  tickets: ticketsSchema.default({ fromChat: true }),
  /** Who the install's emails are from. Without an address it sends none. */
  email: emailSchema.default(() => emailSchema.parse({})),
  help_center: helpCenterSchema.default(() => helpCenterSchema.parse({})),
  guest_details: guestDetailsSchema.default("email"),
  /**
   * The sites that may show the chat in a frame, as hosts such as `example.com` or
   * `*.example.com`. Empty means any site, so a new install works before it is configured.
   */
  allowed_domains: z.array(allowedDomainSchema).default([]),
  /** Where a conversation may come from, such as the website or a mobile app. */
  sources: z.array(z.string().min(1)).min(1).default(["web"]),
  visitors: visitorsSchema.default(visitorsDefault),
});

export const settingsSchema = storedSettingsSchema.transform((stored) => ({
  brand: stored.brand,
  widget: stored.widget,
  chatPage: stored.chat_page,
  tickets: stored.tickets,
  email: stored.email,
  helpCenter: stored.help_center,
  guestDetails: stored.guest_details,
  allowedDomains: stored.allowed_domains,
  sources: stored.sources,
  visitors: stored.visitors,
}));

export type Settings = z.infer<typeof settingsSchema>;

/** The settings anyone may read, including a visitor with no session. */
export type PublicSettings = Pick<
  Settings,
  "brand" | "widget" | "chatPage" | "helpCenter" | "tickets" | "guestDetails" | "visitors"
>;

/** For checking settings that arrive from somewhere other than the database, such as a preview. */
export const publicSettingsSchema = z.object({
  brand: brandSchema,
  widget: widgetSchema,
  chatPage: chatPageSchema,
  helpCenter: helpCenterSchema,
  tickets: ticketsSchema,
  guestDetails: guestDetailsSchema,
  // Left out by a preview sent before this existed, which then shows the chat as it is.
  visitors: visitorsSchema.default(visitorsDefault),
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
  const { brand, widget, chatPage, helpCenter, tickets, guestDetails, visitors } =
    parseSettings(rows);
  return { brand, widget, chatPage, helpCenter, tickets, guestDetails, visitors };
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
      button: accentColorSchema.optional(),
      poweredBy: z.boolean().optional(),
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
    chatPage: pageTextPatchSchema.extend({
      headerStyle: helpHeaderStyleSchema,
      headerImage: z.url().max(2000).optional(),
    }),
    tickets: z.object({ fromChat: z.boolean() }),
    email: z.object({
      fromName: z.string().trim().min(1).max(60).optional(),
      fromAddress: z.string().trim().toLowerCase().pipe(z.email()).optional(),
      replies: z.boolean(),
      status: z.boolean(),
      inbound: z.object({
        enabled: z.boolean(),
        // A plus of its own would be taken for the start of the signed part.
        address: z
          .string()
          .trim()
          .toLowerCase()
          .pipe(z.email())
          .refine((address) => !address.split("@")[0]?.includes("+"))
          .optional(),
        provider: inboundProviderSchema,
      }),
    }),
    helpCenter: pageTextPatchSchema.extend({
      headerStyle: helpHeaderStyleSchema,
      headerImage: z.url().max(2000).optional(),
      searchPlaceholder: z.string().trim().min(1).max(60).optional(),
      headerLinks: z.array(helpLinkSchema).max(HELP_HEADER_LINKS_MAX),
      footerLinks: z.array(helpLinkSchema).max(HELP_FOOTER_LINKS_MAX),
      showChat: z.boolean(),
      seoTitle: z.string().trim().min(1).max(70).optional(),
      seoDescription: z.string().trim().min(1).max(200).optional(),
      url: z
        .url()
        .max(500)
        .regex(/^https?:\/\//)
        // Paths are joined to it, so it carries no slash of its own at the end.
        .transform((value) => value.replace(/\/+$/, ""))
        .optional(),
    }),
    guestDetails: guestDetailsSchema,
    allowedDomains: z.array(allowedDomainSchema).max(50),
    visitors: z.object({ tracking: z.boolean(), liveList: z.boolean() }),
  })
  .partial();

export type SettingsPatch = z.input<typeof settingsPatchSchema>;

export type UpdateSettingsResult = { ok: true } | { ok: false; reason: "forbidden" };

/** Where the brand's pictures are kept, and what one may be. The bucket enforces the same limits. */
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
  // Public, because the chat decides from it whether to offer the form.
  tickets: { key: "tickets", isPublic: true },
  // Not public: a visitor has no use for the address, and it is nobody's to harvest.
  email: { key: "email", isPublic: false },
  helpCenter: { key: "help_center", isPublic: true },
  guestDetails: { key: "guest_details", isPublic: true },
  allowedDomains: { key: "allowed_domains", isPublic: false },
  // Public, because the chat decides from it whether to check in.
  visitors: { key: "visitors", isPublic: true },
} as const satisfies Record<keyof SettingsPatch, { key: string; isPublic: boolean }>;

/** Postgres's error code for an action the access rules do not allow. */
const NOT_ALLOWED = "42501";

export function createSettings(supabase: HelpwrenSupabaseClient) {
  /** Puts a picture in the brand's bucket under a new name that starts with what it is. */
  async function uploadBrandImage(file: Blob, kind: string): Promise<UploadLogoResult> {
    const extension = (LOGO_TYPES as Record<string, string | undefined>)[file.type];
    if (!extension) return { ok: false, reason: "unsupported" };
    if (file.size > LOGO_MAX_BYTES) return { ok: false, reason: "too_large" };

    const path = `${kind}-${crypto.randomUUID()}.${extension}`;
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
      throw new HelpwrenError("Could not store the picture.", { cause: error });
    }
    return { ok: true, url: bucket.getPublicUrl(path).data.publicUrl };
  }

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
    uploadLogo: (file: Blob): Promise<UploadLogoResult> => uploadBrandImage(file, "logo"),

    /** Stores the picture for the help center's header, to save as `helpCenter.headerImage`. */
    uploadHeaderImage: (file: Blob): Promise<UploadLogoResult> =>
      uploadBrandImage(file, "help-header"),

    /** Stores the picture behind the top of the chat page, to save as `chatPage.headerImage`. */
    uploadChatHeaderImage: (file: Blob): Promise<UploadLogoResult> =>
      uploadBrandImage(file, "chat-header"),

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
