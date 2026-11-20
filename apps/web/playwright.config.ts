import { defineConfig, devices } from "@playwright/test";

import { EXAMPLE_PORT, GLOWN_JWT_SECRET } from "./e2e/glown/support/hosts";

// Another port runs a second copy beside the usual one, such as against a throwaway database.
const PORT = Number(process.env.E2E_PORT ?? 3000);
const APP_URL = `http://localhost:${PORT}`;

/**
 * End-to-end tests, in `e2e/`. They need the local Supabase stack and `.env.local`:
 * `pnpm db:start`, then `pnpm db:env`.
 */
export default defineConfig({
  testDir: "./e2e",
  // Starts from the demo's settings, and puts back whatever was set before when the run ends.
  globalSetup: "./e2e/support/global-setup.ts",
  // The tests share one database and one test mailbox.
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: APP_URL,
    // A step that cannot be done fails with its own explanation, well before the whole test does.
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: process.env.CI
        ? `pnpm build && pnpm start --port ${PORT}`
        : `pnpm dev --port ${PORT}`,
      url: APP_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
    {
      // A site on another origin that embeds the widget, as an adopter's would.
      command: "node ../../examples/plain-html/serve.mjs",
      url: "http://127.0.0.1:4100",
      reuseExistingServer: !process.env.CI,
    },
    {
      // Glown's public site and web app (examples/nextjs), with the install as its Helpwren.
      command: process.env.CI
        ? "pnpm --filter @helpwren/example-nextjs build && pnpm --filter @helpwren/example-nextjs start"
        : "pnpm --filter @helpwren/example-nextjs dev",
      url: `http://127.0.0.1:${EXAMPLE_PORT}`,
      env: {
        PORT: String(EXAMPLE_PORT),
        NEXT_PUBLIC_HELPWREN_URL: APP_URL,
        GLOWN_JWT_SECRET,
      },
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
});
