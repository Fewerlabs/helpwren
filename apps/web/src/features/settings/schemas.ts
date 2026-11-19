import {
  endpointUrlSchema,
  fieldPathSchema,
  identitySettingsSchema,
  serviceAccountSchema,
  type IdentitySettings,
} from "@helpwren/adapters/settings";
import {
  agentRoleSchema,
  guestDetailsSchema,
  HELP_FOOTER_LINKS_MAX,
  HELP_HEADER_LINKS_MAX,
  helpHeaderStyleSchema,
  QUICK_REPLIES_MAX,
  QUICK_REPLY_MAX_LENGTH,
  settingsPatchSchema,
} from "@helpwren/core";
import { z } from "zod";

const widgetPatchSchema = settingsPatchSchema.shape.widget.unwrap();

export const generalSchema = z.object({
  guestDetails: guestDetailsSchema,
  /** Whether a visitor can open a ticket themselves from the chat. */
  ticketsFromChat: z.boolean(),
});
export type GeneralValues = z.infer<typeof generalSchema>;

export const installationSchema = z.object({
  allowedDomains: settingsPatchSchema.shape.allowedDomains.unwrap(),
});
export type InstallationValues = z.infer<typeof installationSchema>;

export const inviteSchema = z.object({
  name: z.string().trim().min(1, "Enter their name.").max(120),
  email: z.string().trim().toLowerCase().pipe(z.email("Enter their email address.")),
  role: agentRoleSchema,
});
export type InviteValues = z.infer<typeof inviteSchema>;

export const memberChangeSchema = z.object({
  id: z.uuid(),
  change: z.union([z.object({ role: agentRoleSchema }), z.object({ active: z.boolean() })]),
});
export type MemberChange = z.infer<typeof memberChangeSchema>["change"];

const hex = /^#[0-9a-f]{6}$/;

/** One row of the help center's header or footer links, as typed. */
const linkRowSchema = z.object({
  label: z.string().trim().min(1, "Give the link a name.").max(40, "Keep the name short."),
  url: z
    .string()
    .trim()
    .max(500)
    .regex(
      /^(https?:\/\/\S+|\/(?!\/)\S*|mailto:\S+)$/,
      "Enter a web address such as https://example.com, or a path such as /pricing.",
    ),
});
export type LinkRow = z.infer<typeof linkRowSchema>;

/** Everything on the Branding page. Text left empty goes back to Helpwren's own wording. */
export const brandingSchema = z.object({
  brandName: z
    .string()
    .trim()
    .min(1, "Enter a name.")
    .max(60, "Keep the name under 60 characters."),
  /** The address of the uploaded logo. Empty for none. */
  logo: z.string(),
  accent: z.string().regex(hex),
  /** Empty for a solid colour. */
  accentTo: z.union([z.literal(""), z.string().regex(hex)]),
  /** The colour of buttons. The same as `accent` when they follow the brand. */
  button: z.string().regex(hex),
  poweredBy: z.boolean(),
  position: widgetPatchSchema.shape.position,
  offsetX: widgetPatchSchema.shape.offsetX,
  offsetY: widgetPatchSchema.shape.offsetY,
  launcher: widgetPatchSchema.shape.launcher,
  greeting: z.string().trim().max(60, "Keep the greeting under 60 characters."),
  intro: z.string().trim().max(80, "Keep this line under 80 characters."),
  welcome: z.string().trim().max(500, "Keep the message under 500 characters."),
  quickReplies: z
    .array(z.string().trim().min(1).max(QUICK_REPLY_MAX_LENGTH, "Keep each reply short."))
    .max(QUICK_REPLIES_MAX, `Offer ${QUICK_REPLIES_MAX} replies at most.`),
  chatTitle: z.string().trim().max(80, "Keep the title under 80 characters."),
  chatIntro: z.string().trim().max(200, "Keep this under 200 characters."),
  chatHeaderStyle: helpHeaderStyleSchema,
  /** The address of the uploaded picture behind the top of the chat page. Empty for none. */
  chatHeaderImage: z.string(),
  helpTitle: z.string().trim().max(80, "Keep the title under 80 characters."),
  helpIntro: z.string().trim().max(200, "Keep this under 200 characters."),
  helpHeaderStyle: helpHeaderStyleSchema,
  /** The address of the uploaded header picture. Empty for none. */
  helpHeaderImage: z.string(),
  helpSearchPlaceholder: z.string().trim().max(60, "Keep this under 60 characters."),
  helpHeaderLinks: z
    .array(linkRowSchema)
    .max(HELP_HEADER_LINKS_MAX, `Add ${HELP_HEADER_LINKS_MAX} links at most.`),
  helpFooterLinks: z
    .array(linkRowSchema)
    .max(HELP_FOOTER_LINKS_MAX, `Add ${HELP_FOOTER_LINKS_MAX} links at most.`),
  helpShowChat: z.boolean(),
  helpSeoTitle: z.string().trim().max(70, "Keep the title under 70 characters."),
  helpSeoDescription: z.string().trim().max(200, "Keep this under 200 characters."),
  /** Where visitors reach the help center, when it is served from another site. Empty for here. */
  helpUrl: z.union([
    z.literal(""),
    z
      .string()
      .trim()
      .max(500)
      .regex(/^https?:\/\/\S+$/, "Enter the full address, such as https://example.com/help."),
  ]),
});
export type BrandingValues = z.infer<typeof brandingSchema>;

/** Helpwren's own green. Choosing it is the same as choosing no colour. */
export const DEFAULT_ACCENT = "#3d6b57";

type Patch = z.infer<typeof settingsPatchSchema>;

/** The form's values as the settings they stand for, with empty text left out. */
export function brandingToSettings(values: BrandingValues) {
  const text = (value: string) => (value ? value : undefined);
  const own = values.accent !== DEFAULT_ACCENT || values.accentTo !== "";
  return {
    brand: {
      name: values.brandName,
      logo: text(values.logo),
      accent: own ? values.accent : undefined,
      accentTo: own ? text(values.accentTo) : undefined,
      button: values.button === values.accent ? undefined : values.button,
      // Saved only when turned off, so the stored brand stays as short as it was.
      poweredBy: values.poweredBy ? undefined : false,
    },
    widget: {
      position: values.position,
      offsetX: values.offsetX,
      offsetY: values.offsetY,
      launcher: values.launcher,
      greeting: text(values.greeting),
      intro: text(values.intro),
      welcome: text(values.welcome),
      quickReplies: values.quickReplies,
    },
    chatPage: {
      title: text(values.chatTitle),
      intro: text(values.chatIntro),
      headerStyle:
        values.chatHeaderStyle === "image" && !values.chatHeaderImage
          ? "brand"
          : values.chatHeaderStyle,
      headerImage: text(values.chatHeaderImage),
    },
    helpCenter: {
      title: text(values.helpTitle),
      intro: text(values.helpIntro),
      // A picture style with no picture would be an empty band, so it falls back to the brand's.
      headerStyle:
        values.helpHeaderStyle === "image" && !values.helpHeaderImage
          ? "brand"
          : values.helpHeaderStyle,
      headerImage: text(values.helpHeaderImage),
      searchPlaceholder: text(values.helpSearchPlaceholder),
      headerLinks: values.helpHeaderLinks,
      footerLinks: values.helpFooterLinks,
      showChat: values.helpShowChat,
      seoTitle: text(values.helpSeoTitle),
      seoDescription: text(values.helpSeoDescription),
      url: text(values.helpUrl.replace(/\/+$/, "")),
    },
  } satisfies Patch;
}

export const profileSchema = z.object({
  /** The address of their uploaded photo. Empty for none. */
  photo: z.string().max(2000),
  name: z
    .string()
    .trim()
    .min(1, "Enter your name.")
    .max(120, "Keep your name under 120 characters."),
});
export type ProfileValues = z.infer<typeof profileSchema>;

export const teamGroupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Give the team a name.")
    .max(60, "Keep the name under 60 characters."),
  memberIds: z.array(z.uuid()),
});
export type TeamGroupValues = z.infer<typeof teamGroupSchema>;

export const emailSchema = z.object({
  /** Email a contact a reply they have not read after a few minutes. */
  replies: z.boolean(),
  /** Email a contact when the team changes their ticket's status. */
  status: z.boolean(),
  /** Empty for the brand's own name. */
  fromName: z.string().trim().max(60, "Keep the name under 60 characters."),
  /** Empty while no address has been chosen; nothing is sent until one is. */
  fromAddress: z.union([
    z.literal(""),
    z.string().trim().toLowerCase().pipe(z.email("Enter an email address.")),
  ]),
});
export type EmailValues = z.infer<typeof emailSchema>;

/**
 * The Identity page. The profile endpoint's mapping is typed as text, the way an admin reads it
 * off the product's answer: paths joined by dots, a name made of several fields separated by
 * commas, and one `left = right` pair per line for audiences and attributes.
 */
export const identitySchema = z
  .object({
    mode: z.enum(["none", "signed_token", "profile_endpoint"]),
    url: z.string().trim(),
    idField: z.string().trim(),
    nameFields: z.string().trim(),
    emailField: z.string().trim(),
    orgIdField: z.string().trim(),
    orgNameField: z.string().trim(),
    audienceField: z.string().trim(),
    audiences: z.string(),
    attributes: z.string(),
  })
  .superRefine((values, context) => {
    if (values.mode !== "profile_endpoint") return;
    const problem = (path: keyof typeof values, message: string) => {
      context.addIssue({ code: "custom", path: [path], message });
    };

    if (!endpointUrlSchema.safeParse(values.url).success) {
      problem("url", "Enter an https:// address. Plain http:// works only for localhost.");
    }
    if (!fieldPathSchema.safeParse(values.idField).success) {
      problem("idField", "Enter where the user's id is, such as data.id.");
    }
    for (const [path, value] of [
      ["emailField", values.emailField],
      ["orgIdField", values.orgIdField],
      ["orgNameField", values.orgNameField],
      ["audienceField", values.audienceField],
    ] as const) {
      if (value !== "" && !fieldPathSchema.safeParse(value).success) {
        problem(path, "Use names joined by dots, such as data.email.");
      }
    }
    if (splitList(values.nameFields).some((part) => !fieldPathSchema.safeParse(part).success)) {
      problem(
        "nameFields",
        "Use paths separated by commas, such as data.firstName, data.lastName.",
      );
    }
    if (pairs(values.audiences) === null) {
      problem("audiences", "Write one pair a line, such as Business = business.");
    }
    const attributes = pairs(values.attributes);
    if (
      attributes === null ||
      Object.values(attributes).some((path) => !fieldPathSchema.safeParse(path).success)
    ) {
      problem("attributes", "Write one pair a line, such as Plan = data.plan.");
    }
  });
export type IdentityValues = z.infer<typeof identitySchema>;

function splitList(text: string): string[] {
  return text
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part !== "");
}

/** `left = right` lines as a record, or `null` if a line is not one. Blank lines are skipped. */
function pairs(text: string): Record<string, string> | null {
  const result: Record<string, string> = {};
  for (const line of text.split("\n").map((each) => each.trim())) {
    if (line === "") continue;
    const [left, right, ...rest] = line.split("=").map((part) => part.trim());
    if (!left || !right || rest.length > 0) return null;
    result[left] = right;
  }
  return result;
}

const lines = (record: Record<string, string>) =>
  Object.entries(record)
    .map(([left, right]) => `${left} = ${right}`)
    .join("\n");

/** What the page shows for what is saved. */
export function identityToValues(settings: IdentitySettings): IdentityValues {
  const endpoint = settings.mode === "profile_endpoint" ? settings.endpoint : undefined;
  return {
    mode: settings.mode,
    url: endpoint?.url ?? "",
    idField: endpoint?.fields.id ?? "",
    nameFields: endpoint?.fields.name.join(", ") ?? "",
    emailField: endpoint?.fields.email ?? "",
    orgIdField: endpoint?.fields.orgId ?? "",
    orgNameField: endpoint?.fields.orgName ?? "",
    audienceField: endpoint?.fields.audience ?? "",
    audiences: lines(endpoint?.audiences ?? {}),
    attributes: lines(endpoint?.attributes ?? {}),
  };
}

/** What is saved for what the page holds. `null` if it does not make a valid setting. */
export function identityFromValues(values: IdentityValues): IdentitySettings | null {
  if (values.mode !== "profile_endpoint") return { mode: values.mode };
  const optional = (path: string) => (path === "" ? undefined : path);
  const parsed = identitySettingsSchema.safeParse({
    mode: "profile_endpoint",
    endpoint: {
      url: values.url,
      fields: {
        id: values.idField,
        name: splitList(values.nameFields),
        email: optional(values.emailField),
        orgId: optional(values.orgIdField),
        orgName: optional(values.orgNameField),
        audience: optional(values.audienceField),
      },
      audiences: pairs(values.audiences) ?? {},
      attributes: pairs(values.attributes) ?? {},
    },
  });
  return parsed.success ? parsed.data : null;
}

/**
 * The Mobile page. A secret left empty keeps the one already saved: the Expo access token, and
 * the Firebase service account's key file, pasted as the JSON Firebase gives.
 */
export const mobileSchema = z
  .object({
    expo: z.boolean(),
    fcm: z.boolean(),
    webhook: z.boolean(),
    webhookUrl: z.string().trim(),
    accessToken: z.string().trim().max(200, "That is longer than an Expo access token."),
    serviceAccount: z.string().trim().max(20_000, "That is longer than a key file."),
  })
  .superRefine((values, context) => {
    if (values.webhook && !endpointUrlSchema.safeParse(values.webhookUrl).success) {
      context.addIssue({
        code: "custom",
        path: ["webhookUrl"],
        message: "Enter an https:// address. Plain http:// works only for localhost.",
      });
    }
    if (values.serviceAccount !== "" && serviceAccountFrom(values.serviceAccount) === null) {
      context.addIssue({
        code: "custom",
        path: ["serviceAccount"],
        message: "Paste the whole key file Firebase gave you, as it is.",
      });
    }
  });
export type MobileValues = z.infer<typeof mobileSchema>;

/** A pasted key file, if it is a service account's. */
export function serviceAccountFrom(text: string): unknown {
  try {
    const parsed: unknown = JSON.parse(text);
    return serviceAccountSchema.safeParse(parsed).success ? parsed : null;
  } catch {
    return null;
  }
}
