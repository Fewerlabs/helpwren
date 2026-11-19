import type { Metadata } from "next";

import { requireAgent } from "@/features/agent-auth";
import { ArticleEditor } from "@/features/articles";

export const metadata: Metadata = { title: "Edit article" };

export default async function ArticleEditorPage({ params }: PageProps<"/dashboard/help/[id]">) {
  await requireAgent();
  const { id } = await params;
  return <ArticleEditor articleId={id} />;
}
