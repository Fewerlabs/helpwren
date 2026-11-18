import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: ["src/**/*.test.ts"],
        },
      },
      {
        test: {
          // Needs the local Supabase stack: `pnpm db:start`.
          name: "db",
          include: ["tests/**/*.db.test.ts"],
          // Realtime takes about five seconds to refuse a subscription, the default limit.
          testTimeout: 20_000,
          // The tests share one database and sign in as the same people.
          fileParallelism: false,
        },
      },
    ],
  },
});
