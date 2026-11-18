import { richTextToPlainText, type Article, type ArticleSummary } from "@helpwren/core";
import { cn, RichText, richTextHeadings, type RichTextHeading } from "@helpwren/design-system";

import { formatDate, readingMinutes } from "../format";
import { collectionPath, HELP_PATH } from "../urls";
import { ArticleFeedback } from "./article-feedback";
import { Breadcrumbs } from "./breadcrumbs";
import { ArticleList } from "./collection-grid";
import { ChatLink } from "./help-chat";

function Contents({ headings }: { headings: readonly RichTextHeading[] }) {
  return (
    <ul className="grid gap-1.5 text-sm">
      {headings.map((heading) => (
        <li key={heading.id} className={cn(heading.level > 2 && "pl-3")}>
          <a
            href={`#${heading.id}`}
            className="text-muted-foreground hover:text-foreground focus-visible:outline-ring block rounded-sm text-pretty focus-visible:outline-2"
          >
            {heading.text}
          </a>
        </li>
      ))}
    </ul>
  );
}

export interface ArticleViewProps {
  article: Article;
  /** Who wrote it, when the help center should say. */
  author?: string | undefined;
  /** Other articles in the same collection, to read next. */
  related: readonly ArticleSummary[];
  /** Leaves out the parts that only make sense once it is published, for a preview of a draft. */
  preview?: boolean;
}

/**
 * One article as a reader sees it: the way back up, the title, the body with a table of
 * contents beside it, then whether it helped, what to read next and how to reach a person.
 */
export function ArticleView({ article, author, related, preview = false }: ArticleViewProps) {
  const headings = richTextHeadings(article.body);
  const minutes = readingMinutes(richTextToPlainText(article.body));
  // Two headings make a table of contents; one is only the article's own outline.
  const hasContents = headings.length >= 2;

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
      <Breadcrumbs
        crumbs={[
          { label: "Help center", href: HELP_PATH },
          ...(article.collection
            ? [{ label: article.collection.name, href: collectionPath(article.collection.slug) }]
            : []),
          { label: article.title },
        ]}
      />

      <div
        className={cn(
          "mt-6 grid gap-x-14 gap-y-8",
          hasContents && "lg:grid-cols-[minmax(0,1fr)_15rem]",
        )}
      >
        <article className="max-w-3xl min-w-0">
          <header>
            <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              {article.title}
            </h1>
            {article.summary ? (
              <p className="text-muted-foreground mt-3 text-lg text-pretty">{article.summary}</p>
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

          {hasContents ? (
            // On a narrow screen the contents fold away above the article.
            <details className="border-rule bg-card mt-6 rounded-xl border px-4 py-3 lg:hidden">
              <summary className="cursor-pointer font-medium">On this page</summary>
              <div className="mt-3">
                <Contents headings={headings} />
              </div>
            </details>
          ) : null}

          <RichText doc={article.body} className="mt-8" />

          {preview ? null : (
            <div className="mt-12 grid gap-10">
              <ArticleFeedback articleId={article.id} />

              {related.length > 0 ? (
                <section aria-labelledby="related-articles">
                  <h2 id="related-articles" className="mb-3 text-lg font-semibold">
                    Related articles
                  </h2>
                  <ArticleList label="Related articles" articles={related} />
                </section>
              ) : null}

              <section
                aria-labelledby="still-need-help"
                className="bg-muted/60 flex flex-wrap items-center justify-between gap-x-6 gap-y-4 rounded-2xl px-6 py-6"
              >
                <div>
                  <h2 id="still-need-help" className="text-lg font-semibold">
                    Still need help?
                  </h2>
                  <p className="text-muted-foreground mt-1">
                    Send us a message and a person on our team will answer.
                  </p>
                </div>
                <ChatLink />
              </section>
            </div>
          )}
        </article>

        {hasContents ? (
          <aside className="max-lg:hidden">
            <nav aria-label="On this page" className="sticky top-8">
              <p className="text-2xs mb-3 font-mono tracking-wider uppercase">On this page</p>
              <Contents headings={headings} />
            </nav>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
