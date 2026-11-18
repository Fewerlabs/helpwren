import {
  agentRoleSchema,
  guestDetailsSchema,
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
  helpTitle: z.string().trim().max(80, "Keep the title under 80 characters."),
  helpIntro: z.string().trim().max(200, "Keep this under 200 characters."),
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
    chatPage: { title: text(values.chatTitle), intro: text(values.chatIntro) },
    helpCenter: { title: text(values.helpTitle), intro: text(values.helpIntro) },
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
