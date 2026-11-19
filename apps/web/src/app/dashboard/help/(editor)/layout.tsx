import type { ReactNode } from "react";

import { requireAgent } from "@/features/agent-auth";
import { ArticleEditorRoute } from "@/features/articles";

/**
 * The article editor lives in this layout, not in its pages, because a layout stays mounted
 * while the address changes beneath it. A new article (`/dashboard/help/new`) takes its own
 * address once it is first saved, and the writer carries on typing in the same editor.
 */
export default async function ArticleEditorLayout({ children }: { children: ReactNode }) {
  await requireAgent();
  return (
    <>
      <ArticleEditorRoute />
      {children}
    </>
  );
}
