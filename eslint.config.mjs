import base from "@helpwren/config/eslint/base";

/**
 * Lints the files at the repository root only. Each workspace has its own
 * eslint.config.mjs, which ESLint picks up for files inside that workspace.
 */
export default [
  { ignores: ["apps/**", "packages/**", "examples/nextjs/**", "examples/expo/**", "docs/**"] },
  ...base,
];
