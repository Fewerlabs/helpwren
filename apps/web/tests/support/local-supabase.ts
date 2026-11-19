import { execFileSync } from "node:child_process";

import { z } from "zod";

const statusSchema = z.object({
  API_URL: z.url(),
  PUBLISHABLE_KEY: z.string().min(1),
  SECRET_KEY: z.string().min(1),
});

// Runs before each test file: points the app's environment at the local Supabase stack, or at
// another local stack named by `SUPABASE_WORKDIR`, such as a throwaway one for setup tests.
const workdir = process.env.SUPABASE_WORKDIR;
let output: string;
try {
  output = execFileSync(
    "pnpm",
    ["exec", "supabase", "status", "--output", "json", ...(workdir ? ["--workdir", workdir] : [])],
    { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
  );
} catch (cause) {
  throw new Error("Local Supabase is not running. Start it with `pnpm db:start`.", { cause });
}
// The CLI may print notices before the JSON document.
const status = statusSchema.parse(JSON.parse(output.slice(output.indexOf("{"))));

process.env.NEXT_PUBLIC_SUPABASE_URL = status.API_URL;
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = status.PUBLISHABLE_KEY;
process.env.SUPABASE_SECRET_KEY = status.SECRET_KEY;
