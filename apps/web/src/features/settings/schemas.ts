import { agentRoleSchema, guestDetailsSchema, settingsPatchSchema } from "@helpwren/core";
import { z } from "zod";

export const generalSchema = z.object({
  brandName: z
    .string()
    .trim()
    .min(1, "Enter a name.")
    .max(60, "Keep the name under 60 characters."),
  guestDetails: guestDetailsSchema,
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
