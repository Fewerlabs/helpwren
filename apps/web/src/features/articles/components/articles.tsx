"use client";

import { articleStatusSchema, articleVisibilitySchema, type ArticleSummary } from "@helpwren/core";
import {
  ActionButton,
  Badge,
  Button,
  DataTable,
  EmptyState,
  FilterBar,
  Icon,
  QueryList,
  SearchField,
  toast,
  Tooltip,
  type DataTableColumn,
  type FilterDefinition,
  type FilterValue,
} from "@helpwren/design-system";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { DashboardPage, Panel, PanelHeader, type PageNavItem } from "@/features/dashboard";
import { formatTimeAgo } from "@/lib/format-time";
import { useHelpwren } from "@/lib/helpwren-context";
import { useDebounced } from "@/lib/use-debounced";

import { collectionIcon } from "../collection-icons";
import {
  ARTICLES_QUERY_KEY,
  collectionHref,
  HELP_PATH,
  newArticleHref,
  NO_COLLECTION,
  useArticleCounts,
  useArticlesChanged,
  useCollections,
  useShown,
} from "../hooks/use-articles";
import { ArticleStatusChip } from "./article-status";
import { CollectionDialog } from "./collection-dialog";

const PAGE_SIZE = 25;

const statusFilter: FilterDefinition = {
  id: "status",
  label: "Status",
  icon: "check-circle",
  options: [
    { value: "published", label: "Published" },
    { value: "draft", label: "Draft" },
  ],
};
const visibilityFilter: FilterDefinition = {
  id: "visibility",
  label: "Visibility",
  icon: "eye",
  options: [
    { value: "public", label: "Help center and chat" },
    { value: "in_app", label: "Chat only" },
  ],
};
const featuredFilter: FilterDefinition = {
  id: "featured",
  label: "Featured",
  icon: "star",
  options: [
    { value: "yes", label: "Featured" },
    { value: "no", label: "Not featured" },
  ],
};

/** The one value of a filter with two choices; both ticked is the same as neither. */
function only(value: FilterValue, id: string): string | undefined {
  const chosen = value[id] ?? [];
  return chosen.length === 1 ? chosen[0] : undefined;
}

/**
 * The dashboard's Help center: collections down the side, and the articles of the one chosen
 * in a table to search, filter and put in order. An article opens in the editor.
 */
export function Articles() {
  const getClient = useHelpwren();
  const collections = useCollections();
  const counts = useArticleCounts();
  const shown = useShown(collections.data);
  const changed = useArticlesChanged();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterValue>({});
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<"new" | "current" | null>(null);
  // The order just chosen by dragging, shown until the saved order comes back, so a dropped
  // row stays where it was put instead of jumping back while the change is on its way.
  const [order, setOrder] = useState<{ list: string; ids: readonly string[] } | null>(null);
  const router = useRouter();
  const searchText = useDebounced(search).trim();
  const status = articleStatusSchema.safeParse(only(filter, "status")).data;
  const visibility = articleVisibilitySchema.safeParse(only(filter, "visibility")).data;
  const featuredOnly = only(filter, "featured");
  const tags = filter.tags ?? [];
  const authorIds = filter.author ?? [];
  const filtered = Object.values(filter).some((chosen) => chosen.length > 0);

  // The choices for two of the filters come from the data: the tags in use, and the team.
  // Hooks, because the filter bar and the editor both read them.
  const allTags = useQuery({
    queryKey: [...ARTICLES_QUERY_KEY, "tags"],
    queryFn: () => getClient().articles.tags(),
  }).data;
  const team = useQuery({ queryKey: ["team"], queryFn: () => getClient().agents.list() }).data;
  const filters = useMemo<FilterDefinition[]>(
    () => [
      statusFilter,
      ...(allTags?.length
        ? [
            {
              id: "tags",
              label: "Tag",
              icon: "tag" as const,
              options: allTags.map((tag) => ({ value: tag, label: tag })),
            },
          ]
        : []),
      ...(team?.length
        ? [
            {
              id: "author",
              label: "Author",
              icon: "user" as const,
              options: team.map((member) => ({ value: member.id, label: member.name })),
            },
          ]
        : []),
      visibilityFilter,
      featuredFilter,
    ],
    [allTags, team],
  );

  // What readers answered, shared by every row. A hook, because no one row owns it.
  const feedback = useQuery({
    queryKey: [...ARTICLES_QUERY_KEY, "feedback"],
    queryFn: () => getClient().articles.feedbackTotals(),
  }).data;

  const collection = shown.kind === "collection" ? shown.collection : undefined;
  const collectionId = shown.kind === "none" ? null : collection?.id;
  const shownKey = shown.kind === "collection" ? shown.collection.id : shown.kind;
  const title = shown.kind === "all" ? "All articles" : (collection?.name ?? "Not in a collection");

  // A new search, filter or collection starts from its first page.
  const filterKey = JSON.stringify(filter);
  const listKey = `${shownKey}:${searchText}:${filterKey}`;
  const [lastListKey, setLastListKey] = useState(listKey);
  if (lastListKey !== listKey) {
    setLastListKey(listKey);
    setPage(1);
  }

  // Order is a collection's own, so it can only be changed while all of it is in view.
  const canReorder = Boolean(collection) && !searchText && !filtered;

  const nav = useMemo<PageNavItem[]>(
    () => [
      {
        href: HELP_PATH,
        label: "All articles",
        icon: "file-text",
        count: counts?.total,
        active: shown.kind === "all",
      },
      ...(collections.data ?? []).map((item) => ({
        href: collectionHref(item.slug),
        label: item.name,
        icon: collectionIcon(item.icon),
        count: item.articleCount,
        active: collection?.id === item.id,
        group: "Collections",
      })),
      ...(counts && counts.uncategorised > 0
        ? [
            {
              href: collectionHref(NO_COLLECTION),
              label: "Not in a collection",
              icon: "folder" as const,
              count: counts.uncategorised,
              active: shown.kind === "none",
              group: "Collections",
            },
          ]
        : []),
    ],
    [collection?.id, collections.data, counts, shown.kind],
  );

  return (
    <DashboardPage
      title="Help center"
      navLabel="Collections"
      nav={nav}
      navAction={
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground w-full justify-start px-2"
          onClick={() => {
            setEditing("new");
          }}
        >
          <Icon name="plus" />
          New collection
        </Button>
      }
    >
      <QueryList
        queryKey={[...ARTICLES_QUERY_KEY, "list", shownKey, searchText, filterKey]}
        queryFn={({ page: number, pageSize }) =>
          getClient().articles.list({
            collectionId,
            status,
            visibility,
            featured: featuredOnly === undefined ? undefined : featuredOnly === "yes",
            tags,
            authorIds,
            search: searchText,
            page: number,
            // A collection is reordered as a whole, so all of it is loaded at once.
            pageSize: collection ? 200 : pageSize,
          })
        }
        pagination="pages"
        pageSize={PAGE_SIZE}
        page={page}
        onPageChange={setPage}
      >
        {(list) => {
          const chosen = order?.list === listKey ? order.ids : null;
          const rows = chosen
            ? chosen.flatMap((id) => list.items.find((article) => article.id === id) ?? [])
            : list.items;

          async function reorder(ids: string[]) {
            setOrder({ list: listKey, ids });
            try {
              await getClient().articles.reorder(ids);
              await changed();
            } catch {
              toast.error("The articles could not be reordered. Try again.");
            }
            // A later drag may have started meanwhile; its order stays until its own save is back.
            setOrder((current) => (current?.ids === ids ? null : current));
          }

          const columns: DataTableColumn<ArticleSummary>[] = [
            {
              id: "title",
              header: "Title",
              rowHeader: true,
              cell: (article) => (
                <Link
                  href={`${HELP_PATH}/${article.id}`}
                  className="focus-visible:outline-ring block max-w-full rounded-md focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  <span className="flex items-center gap-1.5">
                    <span className="truncate font-medium">{article.title}</span>
                    {article.featured ? (
                      <Icon
                        name="star"
                        weight="fill"
                        label="Featured"
                        className="text-ochre size-3.5 shrink-0"
                      />
                    ) : null}
                    {article.visibility === "in_app" ? (
                      <Badge variant="outline" className="shrink-0">
                        Chat only
                      </Badge>
                    ) : null}
                  </span>
                  {article.summary ? (
                    <span className="text-muted-foreground block truncate text-xs font-normal">
                      {article.summary}
                    </span>
                  ) : null}
                </Link>
              ),
            },
            {
              id: "collection",
              header: "Collection",
              hidden: shown.kind !== "all",
              className: "text-muted-foreground max-lg:hidden",
              headerClassName: "max-lg:hidden",
              cell: (article) => article.collection?.name ?? "None yet",
            },
            {
              id: "status",
              header: "Status",
              cell: (article) => <ArticleStatusChip status={article.status} />,
            },
            {
              id: "helpful",
              header: "Found helpful",
              align: "end",
              className: "text-muted-foreground tabular-nums",
              cell: (article) => {
                const totals = feedback?.[article.id];
                if (!totals) return "No answers yet";
                return `${totals.helpful} of ${totals.helpful + totals.unhelpful}`;
              },
            },
            {
              id: "updated",
              header: "Updated",
              align: "end",
              className: "text-muted-foreground tabular-nums",
              cell: (article) => formatTimeAgo(article.updatedAt),
            },
          ];

          // On a phone each article is the title over a line of what else matters, all one link.
          function mobileRow(article: ArticleSummary) {
            return (
              <Link
                href={`${HELP_PATH}/${article.id}`}
                className="hover:bg-muted/50 focus-visible:outline-ring grid min-w-0 gap-1.5 px-3 py-2.5 focus-visible:outline-2 focus-visible:-outline-offset-2"
              >
                <span className="flex items-center gap-1.5">
                  <span className="truncate font-medium">{article.title}</span>
                  {article.featured ? (
                    <Icon
                      name="star"
                      weight="fill"
                      label="Featured"
                      className="text-ochre size-3.5 shrink-0"
                    />
                  ) : null}
                </span>
                <span className="text-muted-foreground flex min-w-0 items-center gap-3 text-xs">
                  <ArticleStatusChip status={article.status} />
                  {article.visibility === "in_app" ? (
                    <span className="shrink-0">Chat only</span>
                  ) : null}
                  {shown.kind === "all" ? (
                    <span className="min-w-0 truncate">
                      {article.collection?.name ?? "No collection"}
                    </span>
                  ) : null}
                  <span className="ml-auto shrink-0 tabular-nums">
                    {formatTimeAgo(article.updatedAt)}
                  </span>
                </span>
              </Link>
            );
          }

          return (
            <Panel aria-label={title} className="h-full">
              <PanelHeader className="justify-between">
                <h2 className="flex min-w-0 items-baseline gap-1.5 font-semibold">
                  <span className="truncate">{title}</span>
                  {list.total === undefined ? null : (
                    <span className="text-muted-foreground text-xs font-normal tabular-nums">
                      {list.total}
                    </span>
                  )}
                </h2>
                <div className="flex shrink-0 items-center gap-1.5">
                  <SearchField
                    aria-label="Search articles"
                    placeholder="Search articles"
                    // Quiet, like the inbox search: a tint with no edge.
                    className="bg-muted dark:bg-muted min-h-8 w-64 border-transparent max-lg:w-44 max-sm:hidden"
                    value={search}
                    onValueChange={setSearch}
                    loading={list.isFetching && searchText !== ""}
                  />
                  {collection ? (
                    <Tooltip content="Edit collection">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Edit the ${collection.name} collection`}
                        onClick={() => {
                          setEditing("current");
                        }}
                      >
                        <Icon name="pencil-simple" />
                      </Button>
                    </Tooltip>
                  ) : null}
                  <ActionButton
                    icon="plus"
                    label="New article"
                    onClick={() => {
                      router.push(newArticleHref(collection?.slug));
                    }}
                  />
                </div>
              </PanelHeader>
              <div className="border-rule flex min-h-11 shrink-0 items-center border-b px-3 py-1.5">
                <FilterBar filters={filters} value={filter} onValueChange={setFilter} />
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                {list.status === "error" ? (
                  <EmptyState
                    scene={false}
                    size="sm"
                    className="pt-10"
                    title="Articles could not be loaded."
                    action={
                      <Button variant="secondary" size="sm" onClick={list.retry}>
                        Try again
                      </Button>
                    }
                  />
                ) : (
                  <DataTable
                    caption={title}
                    density="compact"
                    columns={columns}
                    rows={rows}
                    getRowKey={(article) => article.id}
                    renderMobileRow={mobileRow}
                    reorder={
                      canReorder
                        ? {
                            label: (article) => article.title,
                            onReorder: (keys) => void reorder(keys.map(String)),
                          }
                        : undefined
                    }
                    loading={list.isFetching}
                    empty={
                      searchText || filtered ? (
                        <EmptyState
                          scene="no-results"
                          size="sm"
                          className="py-10"
                          title="No articles found"
                          description="Try other words, or clear the filters."
                        />
                      ) : (
                        <EmptyState
                          scene="first-article"
                          size="sm"
                          className="py-10"
                          title={collection ? "Nothing in this collection yet" : "No articles yet"}
                          description="Write the answers to the questions you are asked most. Visitors find them on your help center and in the chat."
                          action={
                            <Button size="sm" asChild>
                              <Link href={newArticleHref(collection?.slug)}>Write an article</Link>
                            </Button>
                          }
                        />
                      )
                    }
                  />
                )}
              </div>

              {!collection &&
              list.pagination &&
              (list.pagination.hasPrevious || list.pagination.hasNext) ? (
                <footer className="border-rule flex h-11 shrink-0 items-center justify-between border-t px-3">
                  <p className="text-muted-foreground text-xs tabular-nums" aria-live="polite">
                    Page {list.pagination.page}
                    {list.pagination.pageCount ? ` of ${list.pagination.pageCount}` : ""}
                  </p>
                  <div className="flex gap-1.5">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={!list.pagination.hasPrevious}
                      onClick={() => {
                        setPage(page - 1);
                      }}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={!list.pagination.hasNext}
                      onClick={() => {
                        setPage(page + 1);
                      }}
                    >
                      Next
                    </Button>
                  </div>
                </footer>
              ) : null}
            </Panel>
          );
        }}
      </QueryList>

      <CollectionDialog
        collection={editing === "current" ? (collection ?? null) : null}
        collections={collections.data ?? []}
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      />
    </DashboardPage>
  );
}
