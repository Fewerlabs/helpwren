import "server-only";

import { z } from "zod";

import { supabaseAdmin } from "@/lib/supabase/admin";

import { type SmtpServer } from "./smtp";

/** The SMTP server an admin saved in Settings → Email, kept where only the server can read. */
export const SMTP_SECRET = "smtp_server";

const smtpServerSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  user: z.string(),
  password: z.string(),
});

/** The saved SMTP server, or `null` when none was saved. */
export async function getSavedSmtp(): Promise<SmtpServer | null> {
  const { data, error } = await supabaseAdmin
    .from("secrets")
    .select("value")
    .eq("key", SMTP_SECRET)
    .maybeSingle();
  if (error) throw error;
  const parsed = smtpServerSchema.safeParse(data?.value);
  return parsed.success ? parsed.data : null;
}

/** Keeps or, with `null`, removes the saved SMTP server. Only for a caller that checked admin. */
export async function saveSmtp(server: SmtpServer | null): Promise<void> {
  const { error } =
    server === null
      ? await supabaseAdmin.from("secrets").delete().eq("key", SMTP_SECRET)
      : await supabaseAdmin.from("secrets").upsert({ key: SMTP_SECRET, value: server as never });
  if (error) throw error;
}
