import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const path = (relative: string) => fileURLToPath(new URL(relative, import.meta.url));

// Interaction tests can exceed the 5s default when lint and build run alongside.
const TEST_TIMEOUT = 15_000;

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path("./src") } },
  test: {
    environment: "jsdom",
    testTimeout: TEST_TIMEOUT,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
