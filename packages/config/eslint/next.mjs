import next from "@next/eslint-plugin-next";
import tseslint from "typescript-eslint";

import react from "./react.mjs";

/** React rules plus the Next.js plugin (recommended and Core Web Vitals). */
export default tseslint.config(...react, next.configs["core-web-vitals"], {
  rules: {
    // Only applies to the Pages Router; the app uses the App Router exclusively.
    "@next/next/no-html-link-for-pages": "off",
  },
});
