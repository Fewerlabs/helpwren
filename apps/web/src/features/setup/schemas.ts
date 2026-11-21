import { z } from "zod";

import { newPasswordSchema } from "@/lib/password-schema";

/** The install's first admin, as typed in the setup wizard. */
export const firstAdminSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(120),
  email: z.string().trim().toLowerCase().pipe(z.email("Enter your email address.")),
  password: newPasswordSchema,
});
export type FirstAdminValues = z.infer<typeof firstAdminSchema>;

/** The wizard's steps after the first admin, in order. Each one is in the address. */
export const setupSteps = ["brand", "email", "widget"] as const;
export const setupStepSchema = z.enum(setupSteps).catch("brand");
export type SetupStep = z.infer<typeof setupStepSchema>;
