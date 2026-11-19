import { richTextToPlainText, type Article, type ArticleSummary } from "@helpwren/core";
import { Icon, RichText, richTextHeadings } from "@helpwren/design-system";
import Link from "next/link";

import { withEmbed, type HelpEmbed } from "@/lib/help-embed";

import { formatDate, readingMinutes } from "../format";
import { articlePath, collectionPath, HELP_PATH } from "../urls";
import { ArticleFeedback } from "./article-feedback";
import { Breadcrumbs } from "./breadcrumbs";
import { Contents } from "./contents";
import { ChatLink } from "./help-chat";

export interface ArticleViewProps {
  article: Article;
  /** Who wrote it, when the help center should say. */
  author?: string | undefined;
  /** The articles before and after this one in its collection, to read on without going back. */
  previous?: ArticleSummary | undefined;
  next?: ArticleSummary | undefined;
  /** Leaves out the parts that only make sense once it is published, for a preview of a draft. */
  preview?: boolean;
  /** Set inside a host's frame: links stay in the embedded form, and hidden parts are left out. */
  embed?: HelpEmbed | null;
}

function Neighbour({
  article,
  direction,
  embed,
}: {
  article: ArticleSummary;
  direction: "Previous" | "Next";
  embed: HelpEmbed | null;
}) {
  if (!article.collection) return null;
  const next = direction === "Next";
  return (
    <Link
      href={withEmbed(articlePath(article.collection.slug, article.slug), embed)}
      className={`group border-rule hover:border-edge focus-visible:outline-ring flex flex-col gap-1 rounded-xl border px-4 py-3 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
        next ? "items-end text-right sm:col-start-2" : "items-start"
      }`}
    >
      <span className="font-medium text-pretty">{article.title}</span>
      <span className="text-muted-foreground flex items-center gap-1 text-xs">
        {next ? null : <Icon name="caret-left" className="size-3" />}
        {direction}
        {next ? <Icon name="caret-right" className="size-3" /> : null}
      </span>
    </Link>
  );
}

/**
 * One article as a reader sees it: which collection it is in, the title, the body, then
 * whether it helped, what comes before and after it, and how to reach a person. On a wide
 * screen its table of contents sits in the page's right column; here it folds away above the
 * body for narrow ones.
 */
export function ArticleView({
  article,
  author,
  previous,
  next,
  preview = false,
  embed = null,
}: ArticleViewProps) {
  const hidden = (part: "feedback" | "chat") => embed?.hide.includes(part) ?? false;
  const headings = richTextHeadings(article.body);
  const minutes = readingMinutes(richTextToPlainText(article.body));

  return (
    <article>
      {embed ? (
        // Inside a frame there is no list of articles beside the page, so the way back is here.
        <div className="mb-5">
          <Breadcrumbs
            crumbs={[
              { label: "Help center", href: withEmbed(HELP_PATH, embed) },
              ...(article.collection
                ? [
                    {
                      label: article.collection.name,
                      href: withEmbed(collectionPath(article.collection.slug), embed),
                    },
                  ]
                : []),
              { label: article.title },
            ]}
          />
        </div>
      ) : article.collection ? (
        <Link
          href={collectionPath(article.collection.slug)}
          className="text-brand focus-visible:outline-ring mb-2 inline-block rounded-sm text-sm font-medium underline-offset-4 hover:underline focus-visible:outline-2"
        >
          {article.collection.name}
        </Link>
      ) : null}

      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-[2.125rem] sm:leading-tight">
          {article.title}
        </h1>
        {article.summary ? (
          <p className="text-muted-foreground mt-2.5 text-lg text-pretty">{article.summary}</p>
        ) : null}
        <p className="text-muted-foreground mt-4 flex flex-wrap gap-x-2 text-sm">
          {author ? <span>Written by {author}</span> : null}
          {author ? <span aria-hidden="true">·</span> : null}
          <span>
            Updated <time dateTime={article.updatedAt}>{formatDate(article.updatedAt)}</time>
          </span>
          <span aria-hidden="true">·</span>
          <span>{minutes} min read</span>
        </p>
      </header>

      {headings.length >= 2 ? (
        <details className="border-rule mt-6 rounded-xl border px-4 py-3 xl:hidden">
          <summary className="cursor-pointer text-sm font-medium">On this page</summary>
          <div className="mt-3">
            <Contents headings={headings} />
          </div>
        </details>
      ) : null}

      <RichText doc={article.body} className="mt-8" />

      {preview ? null : (
        <div className="border-rule mt-12 grid gap-8 border-t pt-6">
          {hidden("feedback") ? null : <ArticleFeedback articleId={article.id} />}

          {previous || next ? (
            <nav aria-label="More in this collection" className="grid gap-3 sm:grid-cols-2">
              {previous ? (
                <Neighbour article={previous} direction="Previous" embed={embed} />
              ) : null}
              {next ? <Neighbour article={next} direction="Next" embed={embed} /> : null}
            </nav>
          ) : null}

          {hidden("chat") ? null : (
            <p className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
              Still need help?
              <ChatLink newTab={embed !== null} />
            </p>
          )}
        </div>
      )}
    </article>
  );
}
