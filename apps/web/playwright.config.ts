import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests, in `e2e/`. They need the local Supabase stack and `.env.local`:
 * `pnpm db:start`, then `pnpm db:env`.
 */
export default defineConfig({
  testDir: "./e2e",
  // The tests share one database and one test mailbox.
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: "http://localhost:3000",
    // A step that cannot be done fails with its own explanation, well before the whole test does.
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: process.env.CI ? "pnpm build && pnpm start" : "pnpm dev",
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
    {
      // A site on another origin that embeds the widget, as an adopter's would.
      command: "node ../../examples/plain-html/serve.mjs",
      url: "http://127.0.0.1:4100",
      reuseExistingServer: !process.env.CI,
    },
  ],
});
