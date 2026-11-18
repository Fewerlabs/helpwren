import { fileURLToPath } from "node:url";

import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

const configDir = fileURLToPath(new URL("./.storybook", import.meta.url));

// Interaction tests can exceed the 5s default when lint, build and the browser run alongside.
const TEST_TIMEOUT = 15_000;

export default defineConfig({
  test: {
    projects: [
      {
        plugins: [react()],
        test: {
          name: "unit",
          testTimeout: TEST_TIMEOUT,
          environment: "jsdom",
          // The contrast test reads tokens.css as text; without this Vitest stubs CSS out.
          css: true,
          setupFiles: ["./vitest.setup.ts"],
          include: ["src/**/*.test.{ts,tsx}"],
        },
      },
      {
        plugins: [tailwindcss(), storybookTest({ configDir })],
        // Pre-bundle these so Vite does not discover them mid-run and reload the tests.
        optimizeDeps: {
          include: [
            "@phosphor-icons/react/ssr",
            "@tanstack/react-query",
            "class-variance-authority",
            "clsx",
            "radix-ui",
            "tailwind-merge",
          ],
        },
        test: {
          name: "storybook",
          testTimeout: TEST_TIMEOUT,
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
});
