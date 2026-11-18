import react from "@helpwren/config/eslint/react";
import storybook from "eslint-plugin-storybook";

const uiMessage =
  "Only base components may import from ui. Use a base component, or add one that wraps the ui component.";
const phosphorMessage =
  "Import icons through the Icon base component. Only base/icon/registry.ts may import Phosphor.";

const phosphor = {
  group: ["@phosphor-icons/react", "@phosphor-icons/react/*"],
  message: phosphorMessage,
};
const ui = { group: ["**/components/ui", "**/components/ui/**", "**/ui/*"], message: uiMessage };
const aboveBase = {
  group: ["**/components/shared", "**/components/shared/**", "**/shared/*"],
  message: "ui and base components must not depend on shared components.",
};

/**
 * The three component layers (see docs/decisions/0002-component-layers.md):
 * ui (shadcn output) <- base (our primitives) <- shared (composed pieces).
 */
export default [
  ...react,
  ...storybook.configs["flat/recommended"],
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: { "no-restricted-imports": ["error", { patterns: [phosphor, ui] }] },
  },
  {
    files: ["src/components/ui/**/*.{ts,tsx}"],
    rules: { "no-restricted-imports": ["error", { patterns: [phosphor, aboveBase] }] },
  },
  {
    files: ["src/components/base/**/*.{ts,tsx}"],
    rules: { "no-restricted-imports": ["error", { patterns: [phosphor, aboveBase] }] },
  },
  {
    files: ["src/components/base/icon/registry.ts"],
    rules: { "no-restricted-imports": ["error", { patterns: [aboveBase] }] },
  },
];
