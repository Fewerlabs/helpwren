import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { ReactNode } from "react";

import { GITHUB_URL } from "@/content/site";
import { docsSource } from "@/lib/docs-source";

import { DocsNavTitle, DocsProvider, DocsThemeSwitch } from "./docs-chrome";

import "./docs.css";

/** The docs: a sidebar of every page, search, and the page with its outline. */
export default function DocsRootLayout({ children }: { children: ReactNode }) {
  return (
    <DocsProvider>
      <DocsLayout
        tree={docsSource.getPageTree()}
        nav={{ url: "/" }}
        githubUrl={GITHUB_URL}
        slots={{ navTitle: DocsNavTitle, themeSwitch: DocsThemeSwitch }}
      >
        {children}
      </DocsLayout>
    </DocsProvider>
  );
}
