/** Addresses and words used across the site. Every claim here is about something that is built. */

export const SITE_URL = "https://helpwren.fewerlabs.dev";
export const SITE_NAME = "Helpwren";
export const SITE_DESCRIPTION =
  "Live chat that plugs into any product and lives in your own database. Open source and self-hosted: live chat, tickets and a help center, with no per-seat pricing.";

export const GITHUB_REPO = "Fewerlabs/helpwren";
export const GITHUB_URL = `https://github.com/${GITHUB_REPO}`;

const blob = (path: string) => `${GITHUB_URL}/blob/main/${path}`;

export const links = {
  /** The install guide: the installer, Vercel or Docker, and the setup wizard. */
  install: blob("docs/install.md"),
  github: GITHUB_URL,
  docs: `${GITHUB_URL}/tree/main/docs`,
  widgetDocs: blob("docs/widget.md"),
  mobileDocs: blob("docs/mobile.md"),
  contributing: blob("CONTRIBUTING.md"),
  licence: blob("LICENSE"),
} as const;

/** The snippet Settings → Installation shows, with an example address. */
export const SNIPPET_URL = "https://support.example.com/widget.js";

export const snippetTabs = [
  {
    label: "HTML",
    language: "html",
    code: [
      `<script src="${SNIPPET_URL}"></script>`,
      "<script>",
      '  Helpwren.init({ source: "web" });',
      "</script>",
    ].join("\n"),
  },
  {
    label: "Next.js",
    language: "jsx",
    code: [
      '"use client";',
      "",
      'import Script from "next/script";',
      "",
      "// Render this once, in your root layout.",
      "export function HelpwrenChat() {",
      "  return (",
      "    <Script",
      `      src="${SNIPPET_URL}"`,
      '      onLoad={() => window.Helpwren.init({ source: "web" })}',
      "    />",
      "  );",
      "}",
    ].join("\n"),
  },
] as const;
