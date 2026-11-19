import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import { createTypeScriptImportResolver } from "eslint-import-resolver-typescript";
import { flatConfigs as importX } from "eslint-plugin-import-x";
import globals from "globals";
import tseslint from "typescript-eslint";

/**
 * Base rules for every package: typescript-eslint strict (type-aware),
 * import ordering, and Prettier compatibility.
 */
export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "**/coverage/**",
      "**/storybook-static/**",
      "**/.turbo/**",
      "**/next-env.d.ts",
    ],
  },
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  importX.recommended,
  importX.typescript,
  {
    languageOptions: {
      globals: { ...globals.node },
      parserOptions: { projectService: true },
    },
    settings: {
      "import-x/resolver-next": [createTypeScriptImportResolver()],
    },
    linterOptions: {
      reportUnusedDisableDirectives: "error",
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
      "import-x/no-default-export": "error",
      // TypeScript already checks member access; this rule only adds noise on default imports.
      "import-x/no-named-as-default-member": "off",
      "import-x/no-duplicates": ["error", { "prefer-inline": true }],
      "import-x/order": [
        "error",
        {
          groups: ["builtin", "external", "internal", ["parent", "sibling", "index"]],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
        },
      ],
    },
  },
  {
    // Plain JavaScript here is configuration, which is not type-checked and uses default exports.
    files: ["**/*.{js,mjs,cjs}"],
    extends: [tseslint.configs.disableTypeChecked],
    rules: { "import-x/no-default-export": "off" },
  },
  {
    // Tooling and framework entry points must use a default export.
    files: [
      "**/*.config.{ts,mts}",
      "**/.storybook/**",
      "**/*.stories.{ts,tsx}",
      "**/src/app/**/{page,layout,loading,error,not-found,template,default,global-error,route,sitemap,robots}.{ts,tsx}",
    ],
    rules: { "import-x/no-default-export": "off" },
  },
  prettier,
);
