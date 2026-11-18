import { type Database } from "@helpwren/core";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

// The same file the app reads. `pnpm db:env` writes it for the local stack.
process.loadEnvFile(".env.local");

const env = z
  .object({ NEXT_PUBLIC_SUPABASE_URL: z.url(), SUPABASE_SECRET_KEY: z.string().min(1) })
  .parse(process.env);

/** Direct access to the local database, to play the part of whoever the browser is not. */
export const database = createClient<Database>(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

/** Removes a guest the test created, with their conversations. */
export async function removeContactByEmail(email: string) {
  const { data } = await database.from("contacts").select("id").eq("email", email);
  for (const { id } of data ?? []) {
    await database.from("conversations").delete().eq("contact_id", id);
    await database.auth.admin.deleteUser(id);
  }
}
