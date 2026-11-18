import jsxA11y from "eslint-plugin-jsx-a11y";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

import base from "./base.mjs";

/** Base rules plus React, hooks and accessibility rules. */
export default tseslint.config(
  ...base,
  react.configs.flat.recommended,
  react.configs.flat["jsx-runtime"],
  reactHooks.configs.flat["recommended-latest"],
  jsxA11y.flatConfigs.strict,
  {
    languageOptions: {
      globals: { ...globals.browser },
    },
    settings: {
      react: { version: "19.3" },
    },
    rules: {
      "react/prop-types": "off",
    },
  },
);
