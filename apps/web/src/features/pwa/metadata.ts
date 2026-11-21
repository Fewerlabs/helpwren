import type { Metadata, Viewport } from "next";

import { APP_COLOURS, MANIFEST_PATH } from "./manifest";

/**
 * For the pages a team member can install the app from: the dashboard and signing in. They
 * link the manifest and the home screen icon; no other page does, so the help center and the
 * chat page never offer to install the team's app.
 */
export const appMetadata: Metadata = {
  manifest: MANIFEST_PATH,
  appleWebApp: { capable: true, statusBarStyle: "default" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

/** The browser's bar matches the dashboard's canvas, in either theme. */
export const appViewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: APP_COLOURS.light },
    { media: "(prefers-color-scheme: dark)", color: APP_COLOURS.dark },
  ],
};
