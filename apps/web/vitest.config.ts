import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const path = (relative: string) => fileURLToPath(new URL(relative, import.meta.url));

// Interaction tests can exceed the 5s default when lint and build run alongside.
const TEST_TIMEOUT = 15_000;

export default defineConfig({
  test: {
    projects: [
      {
        plugins: [react()],
        resolve: { alias: { "@": path("./src") } },
        test: {
          name: "unit",
          environment: "jsdom",
          testTimeout: TEST_TIMEOUT,
          // The env schema requires these. No unit test reaches a real Supabase project.
          env: {
            NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
            NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
          },
          setupFiles: ["./vitest.setup.ts"],
          include: ["src/**/*.test.{ts,tsx}"],
        },
      },
      {
        resolve: {
          alias: { "@": path("./src"), "server-only": path("./tests/support/empty.ts") },
        },
        test: {
          // Server code against the local Supabase stack: `pnpm db:start`.
          name: "db",
          environment: "node",
          testTimeout: TEST_TIMEOUT,
          setupFiles: ["./tests/support/local-supabase.ts"],
          include: ["tests/**/*.db.test.ts"],
          // The tests share one database and change its settings.
          fileParallelism: false,
        },
      },
    ],
  },
});
