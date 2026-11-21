import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, passwordSchema } from "@helpwren/core";
import { z } from "zod";

/** A password someone chooses, with messages for a form. Never trimmed: a space is part of it. */
export const newPasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters.`)
  .refine((value) => passwordSchema.safeParse(value).success, {
    error: `Use at most ${PASSWORD_MAX_LENGTH} characters.`,
  });
