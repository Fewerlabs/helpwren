import type { MetadataRoute } from "next";

/** Where the dashboard's manifest is served: under /dashboard, so only its pages link it. */
export const MANIFEST_PATH = "/dashboard/manifest.webmanifest";

/**
 * The dashboard's canvas colour, light and dark, from the design tokens (`--canvas` in
 * packages/design-system/src/tokens/tokens.css): the colour behind the app as it opens, and of
 * the browser's bar around it.
 */
export const APP_COLOURS = { light: "#f3f3f3", dark: "#0c0c0d" } as const;

/**
 * The web app manifest that makes the dashboard installable, named after the install's brand.
 *
 * The scope is the whole site, not only /dashboard: signing in (/login), choosing a first
 * password and accepting an invite have to stay inside the installed app's window, or an
 * iPhone signs in somewhere the app cannot see. The service worker's scope stays /dashboard.
 */
export function buildManifest(brandName: string): MetadataRoute.Manifest {
  return {
    id: "/dashboard",
    name: `${brandName} Support`,
    short_name: brandName,
    description: `Conversations, tickets and the help center for the ${brandName} team.`,
    start_url: "/dashboard/inbox",
    scope: "/",
    display: "standalone",
    orientation: "any",
    theme_color: APP_COLOURS.light,
    background_color: APP_COLOURS.light,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
