import { agentRoleSchema, guestDetailsSchema, settingsPatchSchema } from "@helpwren/core";
import { z } from "zod";

export const generalSchema = z.object({ guestDetails: guestDetailsSchema });
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

export const brandingSchema = z.object({
  brandName: z
    .string()
    .trim()
    .min(1, "Enter a name.")
    .max(60, "Keep the name under 60 characters."),
  /** Empty for Helpwren's own colour. */
  accent: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^(#[0-9a-f]{6})?$/, "Enter a colour as six hex digits, such as #2f6f4f."),
  greeting: z.string().trim().max(60, "Keep the greeting under 60 characters."),
  intro: z.string().trim().max(80, "Keep this line under 80 characters."),
});
export type BrandingValues = z.infer<typeof brandingSchema>;

export const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter your name.")
    .max(120, "Keep your name under 120 characters."),
});
export type ProfileValues = z.infer<typeof profileSchema>;
