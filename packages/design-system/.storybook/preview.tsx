import type { Decorator, Preview } from "@storybook/react-vite";
import { useEffect, type ReactNode } from "react";

import "@fontsource-variable/caveat";
import "@fontsource-variable/figtree";
import "@fontsource-variable/jetbrains-mono";
import { TooltipProvider } from "../src/components/base/tooltip/tooltip";

import "./preview.css";

/** Applies the theme chosen in the toolbar to the document, as an app would. */
function ThemeFrame({ dark, children }: { dark: boolean; children: ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);
  return children;
}

const withTheme: Decorator = (Story, context) => (
  <ThemeFrame dark={context.globals.theme === "dark"}>
    <TooltipProvider>
      <Story />
    </TooltipProvider>
  </ThemeFrame>
);

const preview: Preview = {
  decorators: [withTheme],
  globalTypes: {
    theme: {
      description: "Colour theme",
      toolbar: {
        title: "Theme",
        icon: "mirror",
        items: [
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: "light" },
  parameters: {
    // Accessibility violations fail the story's test instead of only showing a warning.
    a11y: { test: "error" },
    controls: {
      matchers: { color: /(background|color)$/i, date: /Date$/i },
    },
  },
};

export default preview;
