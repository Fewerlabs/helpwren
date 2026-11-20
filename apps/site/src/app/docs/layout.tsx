import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { RootProvider } from "fumadocs-ui/provider/next";
import type { ReactNode } from "react";

import { GITHUB_URL } from "@/content/site";
import { docsSource } from "@/lib/docs-source";

import { DocsNavTitle, DocsSearchDialog, DocsThemeSwitch } from "./docs-chrome";

import "./docs.css";

/**
 * The docs: a sidebar of every page, search, and the page with its outline. The theme is the
 * site's own (the design system's), so Fumadocs' theme provider is off.
 */
export default function DocsRootLayout({ children }: { children: ReactNode }) {
  return (
    <RootProvider theme={{ enabled: false }} search={{ SearchDialog: DocsSearchDialog }}>
      <DocsLayout
        tree={docsSource.getPageTree()}
        nav={{ url: "/" }}
        githubUrl={GITHUB_URL}
        slots={{ navTitle: DocsNavTitle, themeSwitch: DocsThemeSwitch }}
      >
        {children}
      </DocsLayout>
    </RootProvider>
  );
}
