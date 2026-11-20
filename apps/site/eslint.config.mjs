import next from "@helpwren/config/eslint/next";

/** UI comes from @helpwren/design-system, through its entry point only. */
export default [
  // Written by fumadocs-mdx from the docs.
  { ignores: [".source/**"] },
  ...next,
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
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
        },
      ],
    },
  },
];
