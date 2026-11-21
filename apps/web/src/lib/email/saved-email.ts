import "server-only";

import { z } from "zod";

import { supabaseAdmin } from "@/lib/supabase/admin";

import { type SavedEmail } from "./choose";

/** The provider an admin saved in Settings → Email, kept where only the server can read. */
export const EMAIL_PROVIDER_SECRET = "email_provider";

const savedEmailSchema = z.discriminatedUnion("provider", [
  z.object({
    provider: z.literal("smtp"),
    host: z.string().min(1),
    port: z.number().int().min(1).max(65535),
    user: z.string(),
    password: z.string(),
  }),
  z.object({ provider: z.literal("resend"), apiKey: z.string().min(1) }),
]);

/** The saved provider, or `null` when none was saved. */
export async function getSavedEmail(): Promise<SavedEmail | null> {
  const { data, error } = await supabaseAdmin
    .from("secrets")
    .select("value")
    .eq("key", EMAIL_PROVIDER_SECRET)
    .maybeSingle();
  if (error) throw error;
  const parsed = savedEmailSchema.safeParse(data?.value);
  return parsed.success ? parsed.data : null;
}

/** Keeps or, with `null`, removes the saved provider. Only for a caller that checked admin. */
export async function saveEmailProvider(saved: SavedEmail | null): Promise<void> {
  const { error } =
    saved === null
      ? await supabaseAdmin.from("secrets").delete().eq("key", EMAIL_PROVIDER_SECRET)
      : await supabaseAdmin
          .from("secrets")
          .upsert({ key: EMAIL_PROVIDER_SECRET, value: saved as never });
  if (error) throw error;
}
