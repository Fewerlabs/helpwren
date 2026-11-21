// Sets a team member's password from the command line, for when nobody can sign in to set it in
// Settings: no admin has a password yet and no email arrives. The password is typed at a hidden
// prompt, never passed as an argument, so it stays out of the shell's history.
//
// Usage: pnpm agent:password <email>
// For another install's values: node --env-file=<file> scripts/set-password.ts <email>
// A whole-statement type import, so Node drops the line and never loads the package.
import type { Database } from "@helpwren/core";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  // The secret key bypasses the access rules. It is read here, on the command line, and is
  // never sent to a browser.
  SUPABASE_SECRET_KEY: z.string().min(1),
});

// The same rule as everywhere else: at least 8 characters, at most bcrypt's 72 bytes.
const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .refine((value) => new TextEncoder().encode(value).length <= 72, "Use at most 72 characters.");

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

/** Asks a question in the terminal without showing what is typed. */
function askHidden(question: string): Promise<string> {
  const input = process.stdin;
  process.stdout.write(question);
  input.setRawMode(true);
  input.setEncoding("utf8");
  input.resume();
  return new Promise((resolve) => {
    let value = "";
    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === "\r" || char === "\n") {
          input.off("data", onData);
          input.setRawMode(false);
          input.pause();
          process.stdout.write("\n");
          resolve(value);
          return;
        }
        // Ctrl+C still stops it.
        if (char === "\u0003") {
          input.setRawMode(false);
          process.stdout.write("\n");
          process.exit(130);
        }
        if (char === "\u007f" || char === "\b") value = value.slice(0, -1);
        else value += char;
      }
    };
    input.on("data", onData);
  });
}

if (!process.stdin.isTTY) fail("Run this in a terminal, so the password can be typed unseen.");

const email = z.string().trim().toLowerCase().pipe(z.email()).safeParse(process.argv[2]);
if (!email.success) fail("Usage: pnpm agent:password <email>");

const env = envSchema.safeParse(process.env);
if (!env.success) {
  fail("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set in the env file.");
}

const supabase = createClient<Database>(
  env.data.NEXT_PUBLIC_SUPABASE_URL,
  env.data.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

// Only someone on the team: this never gives a password to any other account.
const { data: member, error: lookupError } = await supabase
  .from("agents")
  .select("user_id, name")
  .eq("email", email.data)
  .maybeSingle();
if (lookupError) fail(lookupError.message);
if (!member) fail(`${email.data} is not on the team.`);

const password = await askHidden(`New password for ${member.name}: `);
const checked = passwordSchema.safeParse(password);
if (!checked.success) fail(checked.error.issues[0]?.message ?? "That password cannot be used.");
if ((await askHidden("Type it again: ")) !== password) fail("The two passwords do not match.");

const { error } = await supabase.auth.admin.updateUserById(member.user_id, { password });
if (error) fail(error.message);

console.log(`${member.name} <${email.data}> can now sign in with this password.`);
