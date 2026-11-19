import { Icon } from "@helpwren/design-system";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireAgent } from "@/features/agent-auth";
import { ArticleView, helpMetadata, HelpShell } from "@/features/help-center";
import { getHelpCollections, getHelpSettings } from "@/lib/help-center-data";
import { getHelpwren } from "@/lib/helpwren";

type Props = PageProps<"/help/preview/[id]">;

export async function generateMetadata(): Promise<Metadata> {
  return helpMetadata(await getHelpSettings(), { title: "Preview", noindex: true });
}

/**
 * An article as it will look on the help center, for the team only: a draft before it is
 * published, or a published article as it was last saved. Read as the signed-in team member,
 * so nobody else can open it.
 */
export default async function HelpPreviewPage({ params }: Props) {
  await requireAgent();
  const helpwren = await getHelpwren();
  const [settings, collections, article, team] = await Promise.all([
    getHelpSettings(),
    getHelpCollections(),
    helpwren.articles.get((await params).id),
    helpwren.agents.list(),
  ]);
  if (!article) notFound();

  return (
    <>
      <p
        role="status"
        className="bg-highlighter text-highlighter-foreground flex items-center justify-center gap-2 px-4 py-2 text-center text-sm font-medium"
      >
        <Icon name="eye" className="size-4 shrink-0" />
        {article.status === "published"
          ? "Preview. This article is published."
          : "Preview of a draft. Only your team can see this page."}
      </p>
      <HelpShell
        settings={settings}
        collections={collections}
        current={{ collection: article.collection?.slug, article: article.slug }}
      >
        <ArticleView
          article={article}
          author={team.find((member) => member.id === article.authorId)?.name}
          preview
        />
      </HelpShell>
    </>
  );
}
