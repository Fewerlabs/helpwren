// Writes apps/web/.env.local with the addresses and keys of the local Supabase stack, so the
// app can run against it. Usage: pnpm db:env [--force]
import { execFileSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const target = fileURLToPath(new URL("../apps/web/.env.local", import.meta.url));

if (existsSync(target) && !process.argv.includes("--force")) {
  console.error(`${target} already exists. Run "pnpm db:env --force" to replace it.`);
  process.exit(1);
}

let output;
try {
  output = execFileSync("pnpm", ["exec", "supabase", "status", "--output", "json"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
} catch {
  console.error('Local Supabase is not running. Start it with "pnpm db:start".');
  process.exit(1);
}

// The CLI may print notices before the JSON document.
const status = JSON.parse(output.slice(output.indexOf("{")));

writeFileSync(
  target,
  [
    "# Written by `pnpm db:env` for the local Supabase stack. Not for production.",
    "NEXT_PUBLIC_APP_URL=http://localhost:3000",
    `NEXT_PUBLIC_SUPABASE_URL=${status.API_URL}`,
    `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${status.PUBLISHABLE_KEY}`,
    `SUPABASE_SECRET_KEY=${status.SECRET_KEY}`,
    "",
  ].join("\n"),
);
console.log(`Wrote ${target}`);
