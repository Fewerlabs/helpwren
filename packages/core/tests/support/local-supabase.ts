import { execFileSync } from "node:child_process";

import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { type Database } from "../../src/database.types";

const statusSchema = z.object({
  API_URL: z.url(),
  PUBLISHABLE_KEY: z.string().min(1),
  SECRET_KEY: z.string().min(1),
});

function readStatus() {
  let output: string;
  try {
    output = execFileSync("pnpm", ["exec", "supabase", "status", "--output", "json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch (cause) {
    throw new Error("Local Supabase is not running. Start it with `pnpm db:start`.", { cause });
  }
  // The CLI may print notices before the JSON document.
  return statusSchema.parse(JSON.parse(output.slice(output.indexOf("{"))));
}

const status = readStatus();
const inMemorySession = { auth: { persistSession: false, autoRefreshToken: false } };

/** A client like a browser's: public key, its own session, bound by the access rules. */
export function browserClient() {
  return createClient<Database>(status.API_URL, status.PUBLISHABLE_KEY, inMemorySession);
}

/** A client like the server's: secret key, not bound by the access rules. */
export function serverClient() {
  return createClient<Database>(status.API_URL, status.SECRET_KEY, inMemorySession);
}

/** Issues the sign-in code that would have been emailed to this person. */
export async function issueLoginCode(email: string) {
  const { data, error } = await serverClient().auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (error) throw error;
  return data.properties.email_otp;
}
