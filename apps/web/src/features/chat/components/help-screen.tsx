"use client";

import { type ArticleSummary } from "@helpwren/core";
import {
  AppLoader,
  Button,
  EmptyState,
  Icon,
  QueryDetail,
  QueryList,
  RichText,
  SearchField,
} from "@helpwren/design-system";
import { useState } from "react";

import { ArticleFeedback } from "@/features/help-center";
import { useHelpwren } from "@/lib/helpwren-context";
import { useDebounced } from "@/lib/use-debounced";

import { useShowScreen } from "../store/chat-store";
import { ScreenHeader } from "./screen-header";

/** The start of every help query's key in the chat. */
const HELP_QUERY_KEY = ["chat", "help"] as const;

/** How many articles the home screen suggests. */
const SUGGESTED = 3;

// A line of handwriting, not the wren: this screen wears the customer's brand.
const loading = () => <AppLoader bird={false} size="sm" label="Loading articles" />;

function ArticleRow({ article }: { article: ArticleSummary }) {
  const show = useShowScreen();
  return (
    <button
      type="button"
      className="hover:bg-muted focus-visible:outline-ring flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left transition-colors focus-visible:outline-2"
      onClick={() => {
        show({ name: "article", slug: article.slug });
      }}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-pretty">{article.title}</span>
        {article.summary ? (
          <span className="text-muted-foreground line-clamp-1 block text-xs">
            {article.summary}
          </span>
        ) : null}
      </span>
      <Icon name="caret-right" className="text-muted-foreground size-4 shrink-0" />
    </button>
  );
}

/**
 * Articles offered on the chat's home screen, so an answer may be found before a message is
 * written: the ones the team put forward. Nothing is shown when there are none.
 */
export function SuggestedArticles() {
  const getClient = useHelpwren();
  const show = useShowScreen();
  return (
    <QueryList
      queryKey={[...HELP_QUERY_KEY, "suggested"]}
      queryFn={async () => {
        const page = await getClient().articles.list({
          status: "published",
          featured: true,
          pageSize: SUGGESTED,
        });
        return { items: page.items };
      }}
      pagination="none"
      // Quiet while it loads or if it fails: the home screen is complete without it.
      renderLoading={() => null}
      renderEmpty={() => null}
      renderError={() => null}
    >
      {(list) =>
        list.items.length === 0 ? null : (
          <section aria-labelledby="suggested-articles" className="px-1 pt-5">
            <h2 id="suggested-articles" className="text-muted-foreground px-4 pb-1 text-xs">
              Suggested articles
            </h2>
            <ul>
              {list.items.map((article) => (
                <li key={article.id}>
                  <ArticleRow article={article} />
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="text-primary focus-visible:outline-ring mx-4 mt-1 rounded-sm text-sm font-medium underline-offset-4 hover:underline focus-visible:outline-2"
              onClick={() => {
                show({ name: "help" });
              }}
            >
              Search all articles
            </button>
          </section>
        )
      }
    </QueryList>
  );
}

/** The Help tab: search the articles, or browse them, without leaving the chat. */
export function HelpScreen({ onClose }: { onClose?: (() => void) | undefined }) {
  const getClient = useHelpwren();
  const show = useShowScreen();
  const [search, setSearch] = useState("");
  const query = useDebounced(search).trim();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ScreenHeader title="Help" onClose={onClose} />
      <div className="px-4 pb-3">
        <SearchField
          aria-label="Search for help"
          placeholder="Search for help"
          value={search}
          onValueChange={setSearch}
        />
      </div>
      <QueryList
        queryKey={[...HELP_QUERY_KEY, "list", query]}
        queryFn={async () => {
          const client = getClient();
          // Words typed: the best matches. Nothing typed: every article, the featured first.
          if (query) return { items: await client.articles.search(query, { limit: 20 }) };
          const page = await client.articles.list({ status: "published", pageSize: 50 });
          return {
            items: [...page.items].sort(
              (first, second) => Number(second.featured) - Number(first.featured),
            ),
          };
        }}
        pagination="none"
        className="min-h-0 flex-1 overflow-y-auto"
        contentClassName="px-1 pb-4"
        getItemKey={(article) => article.id}
        renderItem={(article) => <ArticleRow article={article} />}
        renderLoading={loading}
        renderEmpty={() =>
          query ? (
            <EmptyState
              scene="no-results"
              bird={false}
              size="sm"
              className="pt-8"
              title="Nothing matched those words"
              description="Try other words, or send us a message."
              action={
                <Button
                  size="sm"
                  onClick={() => {
                    show({ name: "start" });
                  }}
                >
                  Send us a message
                </Button>
              }
            />
          ) : (
            <EmptyState
              scene="first-article"
              bird={false}
              size="sm"
              className="pt-8"
              title="No articles yet"
              description="Send us a message and we will help."
            />
          )
        }
      />
    </div>
  );
}

export interface ArticleScreenProps {
  slug: string;
  onBack: () => void;
  onClose?: (() => void) | undefined;
}

/** One article, read inside the chat, with a way to write to the team if it falls short. */
export function ArticleScreen({ slug, onBack, onClose }: ArticleScreenProps) {
  const getClient = useHelpwren();
  const show = useShowScreen();

  return (
    <>
      <ScreenHeader title="Help" onBack={onBack} onClose={onClose} />
      <QueryDetail
        queryKey={[...HELP_QUERY_KEY, "article", slug]}
        queryFn={() => getClient().articles.getBySlug(slug, { publishedOnly: true })}
        className="min-h-0 flex-1 overflow-y-auto"
        contentClassName="px-5 pb-6"
        renderLoading={loading}
        renderEmpty={() => (
          <EmptyState
            scene="not-found"
            bird={false}
            size="sm"
            className="pt-8"
            title="This article is no longer here"
            action={
              <Button variant="secondary" size="sm" onClick={onBack}>
                Back
              </Button>
            }
          />
        )}
      >
        {(article) => (
          <article>
            <h2 className="text-xl leading-snug font-semibold tracking-tight text-balance">
              {article.title}
            </h2>
            {article.summary ? (
              <p className="text-muted-foreground mt-1.5 text-sm text-pretty">{article.summary}</p>
            ) : null}
            {/* A size down from the help center's page: the chat is a narrow column. */}
            <RichText doc={article.body} className="mt-5 text-[0.9375rem]" />
            <div className="mt-8 grid gap-3">
              <ArticleFeedback articleId={article.id} />
              <Button
                variant="secondary"
                onClick={() => {
                  show({ name: "start" });
                }}
              >
                <Icon name="chat-circle" />
                Still need help? Send us a message
              </Button>
            </div>
          </article>
        )}
      </QueryDetail>
    </>
  );
}
