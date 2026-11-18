import react from "@helpwren/config/eslint/react";
import storybook from "eslint-plugin-storybook";

const uiMessage =
  "Only base components may import from ui. Use a base component, or add one that wraps the ui component.";
const phosphorMessage =
  "Import icons through the Icon base component. Only base/icon/registry.ts may import Phosphor.";

const cnPackage = {
  name: "cn",
  message: 'Import cn from "#lib/cn". It is configured for our custom Tailwind utilities.',
};
const phosphor = {
  group: ["@phosphor-icons/react", "@phosphor-icons/react/*"],
  message: phosphorMessage,
};
const ui = { group: ["**/components/ui", "**/components/ui/**", "**/ui/*"], message: uiMessage };
const query = {
  group: ["@tanstack/*"],
  message:
    "Only the data layer may fetch. Take data as props here, or build the component in components/data.",
};
const data = {
  group: ["**/components/data", "**/components/data/**", "**/data/*"],
  message: "ui, base and shared components must not depend on data components.",
};
const aboveBase = {
  group: ["**/components/shared", "**/components/shared/**", "**/shared/*"],
  message: "ui and base components must not depend on shared components.",
};

/**
 * The three component layers (see docs/decisions/0002-component-layers.md):
 * ui (shadcn output) <- base (our primitives) <- shared (composed pieces) <- data (fetching).
 */
export default [
  ...react,
  ...storybook.configs["flat/recommended"],
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        { paths: [cnPackage], patterns: [phosphor, ui, query, data] },
      ],
    },
  },
  {
    files: ["src/components/ui/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        { paths: [cnPackage], patterns: [phosphor, aboveBase, query, data] },
      ],
    },
  },
  {
    files: ["src/components/base/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        { paths: [cnPackage], patterns: [phosphor, aboveBase, query, data] },
      ],
    },
  },
  {
    files: ["src/components/base/icon/registry.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        { paths: [cnPackage], patterns: [aboveBase, query, data] },
      ],
    },
  },
  {
    // The package entry point re-exports every public layer.
    files: ["src/index.ts"],
    rules: { "no-restricted-imports": ["error", { patterns: [phosphor, ui, query] }] },
  },
  {
    // The data layer is the one place that may use TanStack Query. It builds on base and shared.
    files: ["src/components/data/**/*.{ts,tsx}"],
    rules: { "no-restricted-imports": ["error", { paths: [cnPackage], patterns: [phosphor, ui] }] },
  },
  {
    // shadcn/ui output is kept as close to upstream as possible, so rules about style that
    // upstream does not follow are off here. The layer rules above still apply.
    files: ["src/components/ui/**/*.{ts,tsx}"],
    rules: {
      "import-x/order": "off",
      "@typescript-eslint/array-type": "off",
      "@typescript-eslint/consistent-type-imports": "off",
      "@typescript-eslint/no-unnecessary-condition": "off",
    },
  },
];
