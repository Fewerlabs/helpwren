import next from "@helpwren/config/eslint/next";

/**
 * Boundaries inside the app (see docs/architecture.md):
 * - UI comes from @helpwren/design-system, through its entry point only.
 * - A feature is used only through its index.ts.
 */
const boundaries = {
  patterns: [
    {
      group: ["@helpwren/design-system/*", "!@helpwren/design-system/styles.css"],
      message: "Import from @helpwren/design-system, not from a path inside it.",
    },
    {
      group: ["@phosphor-icons/*", "lucide-react", "radix-ui", "@radix-ui/*"],
      message: "Use the components and the Icon from @helpwren/design-system.",
    },
  ],
};
const featureInternals = {
  group: ["@/features/*/*"],
  message: "Import a feature through its index.ts: @/features/<feature>.",
};

export default [
  // Built from packages/widget by scripts/build-widget.mjs.
  { ignores: ["public/widget.js"] },
  ...next,
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [...boundaries.patterns, featureInternals] }],
    },
  },
  {
    // Inside a feature, its own files import each other by relative path.
    files: ["src/features/**/*.{ts,tsx}"],
    rules: { "no-restricted-imports": ["error", boundaries] },
  },
  {
    // The icon route serves Phosphor's SVG files, so it reads Phosphor's catalogue itself.
    // Icon components still come from the design system.
    files: ["src/app/api/icons/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            ...boundaries.patterns.filter(
              (pattern) => !pattern.group.includes("@phosphor-icons/*"),
            ),
            {
              group: [
                "@phosphor-icons/react",
                "@phosphor-icons/react/*",
                "lucide-react",
                "radix-ui",
                "@radix-ui/*",
              ],
              message: "Use the components and the Icon from @helpwren/design-system.",
            },
            featureInternals,
          ],
        },
      ],
    },
  },
];
