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
          // The tests share one database and sign in as the same people.
          fileParallelism: false,
        },
      },
    ],
  },
});
