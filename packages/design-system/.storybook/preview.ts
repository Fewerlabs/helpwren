import type { Preview } from "@storybook/react-vite";

import "../src/styles/globals.css";

const preview: Preview = {
  parameters: {
    // Accessibility violations fail the story's test instead of only showing a warning.
    a11y: { test: "error" },
    controls: {
      matchers: { color: /(background|color)$/i, date: /Date$/i },
    },
  },
};

export default preview;
