// Adds a team member, or updates one who already exists. They can then sign in at /inbox/login
// with a code sent to their email. This is the way to invite people until the settings screen
// exists.
//
// Usage: pnpm agent:invite <email> --name "Their Name" [--admin]
import { parseArgs } from "node:util";

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

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  name: z.string().trim().min(1),
  role: z.enum(["admin", "agent"]),
});

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { name: { type: "string" }, admin: { type: "boolean", default: false } },
});

const invite = inviteSchema.safeParse({
  email: positionals[0],
  name: values.name,
  role: values.admin ? "admin" : "agent",
});
if (!invite.success) {
  fail('Usage: pnpm agent:invite <email> --name "Their Name" [--admin]');
}

const env = envSchema.safeParse(process.env);
if (!env.success) {
  fail(
    "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set in apps/web/.env.local. " +
      'For the local database, run "pnpm db:env".',
  );
}

const supabase = createClient<Database>(
  env.data.NEXT_PUBLIC_SUPABASE_URL,
  env.data.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

async function findOrCreateUser(email: string): Promise<string> {
  const created = await supabase.auth.admin.createUser({ email, email_confirm: true });
  if (!created.error) return created.data.user.id;
  if (created.error.code !== "email_exists") fail(created.error.message);

  // There is no lookup by email, so page through the accounts to find the one that exists.
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) fail(error.message);
    const match = data.users.find((user) => user.email === email);
    if (match) return match.id;
    if (data.users.length === 0) fail(`An account for ${email} exists but could not be found.`);
  }
}

const { email, name, role } = invite.data;
const userId = await findOrCreateUser(email);

const { error } = await supabase
  .from("agents")
  .upsert({ user_id: userId, name, email, role, active: true });
if (error) fail(error.message);

console.log(`${name} <${email}> can now sign in as ${role === "admin" ? "an admin" : "an agent"}.`);
