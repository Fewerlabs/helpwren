import next from "@helpwren/config/eslint/next";

/** UI comes from @helpwren/design-system, through its entry point only. */
export default [
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
  {
    // React Three Fiber's elements take three.js properties (position, geometry, material),
    // which this rule only knows for the DOM.
    files: ["src/scenes/**/*.tsx", "src/wren/**/*.tsx"],
    rules: { "react/no-unknown-property": "off" },
  },
];
