"use client";

import { useQuery, type QueryKey } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { cn } from "#lib/cn";

import { EmptyState } from "../shared/empty-state/empty-state";
import {
  DefaultError,
  DefaultLoading,
  DetailSkeleton,
  StickyProgress,
  type QueryBehaviour,
  type QueryErrorContext,
} from "./query-states";

export interface QueryDetailMessages {
  loading: string;
  /** The title when the record does not exist. */
  notFound: ReactNode;
  notFoundDescription?: ReactNode;
  error: ReactNode;
  retry: string;
}

const defaultMessages: QueryDetailMessages = {
  loading: "Loading",
  notFound: "Not found.",
  error: "This could not be loaded.",
  retry: "Try again",
};

export interface QueryDetailState {
  /** True whenever a request is running, including background refreshes. */
  isFetching: boolean;
  refetch: () => void;
}

export interface QueryDetailProps<Data> extends QueryBehaviour {
  /** Identifies this item in the cache, for example `["contact", id]`. */
  queryKey: QueryKey;
  /** Fetches the item. Return `null` when it does not exist. */
  queryFn: (request: { signal: AbortSignal }) => Promise<Data | null | undefined>;
  /** Renders the item once it has loaded. */
  children: (data: Data, state: QueryDetailState) => ReactNode;
  /** Decides whether a loaded value counts as "nothing". Default: `null` or `undefined`. */
  isEmpty?: (data: Data) => boolean;
  /**
   * What the first load shows. `loader` (default) is the app's loader, the same as every list;
   * `skeleton` is a record panel's shape, a name beside an avatar then sections of facts, for a
   * panel whose layout should hold still while it loads. `renderLoading` replaces both.
   */
  placeholder?: "skeleton" | "loader";
  /** A way out of the not-found state, such as Back or Close. */
  notFoundAction?: ReactNode;
  renderLoading?: () => ReactNode;
  renderEmpty?: () => ReactNode;
  renderError?: (context: QueryErrorContext) => ReactNode;
  messages?: Partial<QueryDetailMessages>;
  /** Classes for the outer box: border, background, radius. Keep padding off it. */
  className?: string;
  /** Classes for the content inside, such as padding. The progress bar sits above this, edge to edge. */
  contentClassName?: string;
}

/**
 * Fetches a single item and draws every state of it: a placeholder on the first load, a
 * progress bar on a refresh, not found with a way out, an error with Try again, and the item
 * itself. Results are cached by `queryKey` with TanStack Query, so it needs a
 * `QueryClientProvider` above it.
 */
export function QueryDetail<Data>({
  queryKey,
  queryFn,
  children,
  isEmpty,
  placeholder = "loader",
  notFoundAction,
  renderLoading,
  renderEmpty,
  renderError,
  messages: overrides,
  className,
  contentClassName,
  enabled,
  staleTime,
  gcTime,
  refetchInterval,
  refetchOnWindowFocus,
  retry: retryOption,
}: QueryDetailProps<Data>) {
  const messages = { ...defaultMessages, ...overrides };
  const query = useQuery({
    queryKey,
    queryFn: async ({ signal }) => (await queryFn({ signal })) ?? null,
    ...(enabled === undefined ? {} : { enabled }),
    ...(staleTime === undefined ? {} : { staleTime }),
    ...(gcTime === undefined ? {} : { gcTime }),
    ...(refetchInterval === undefined ? {} : { refetchInterval }),
    ...(refetchOnWindowFocus === undefined ? {} : { refetchOnWindowFocus }),
    ...(retryOption === undefined ? {} : { retry: retryOption }),
  });

  const { data, refetch, isFetching } = query;
  const retry = () => {
    void refetch();
  };
  const hasData = data !== null && data !== undefined && !(isEmpty?.(data) ?? false);

  function body(): ReactNode {
    if (hasData) {
      return children(data, { isFetching, refetch: retry });
    }
    if (query.isPending) {
      return (
        renderLoading?.() ??
        (placeholder === "skeleton" ? (
          <DetailSkeleton label={messages.loading} />
        ) : (
          <DefaultLoading label={messages.loading} />
        ))
      );
    }
    if (query.isError) {
      return (
        renderError?.({ error: query.error, retry, retrying: isFetching }) ?? (
          <DefaultError
            title={messages.error}
            retryLabel={messages.retry}
            retry={retry}
            retrying={isFetching}
          />
        )
      );
    }
    return (
      renderEmpty?.() ?? (
        <EmptyState
          role="status"
          scene="not-found"
          size="sm"
          className="py-10"
          title={messages.notFound}
          {...(messages.notFoundDescription === undefined
            ? {}
            : { description: messages.notFoundDescription })}
          {...(notFoundAction === undefined ? {} : { action: notFoundAction })}
        />
      )
    );
  }

  return (
    <div
      data-slot="query-detail"
      aria-busy={isFetching || undefined}
      className={cn("relative", className)}
    >
      {/* With the item on screen, a refresh shows as a bar along the top so nothing jumps. */}
      <StickyProgress active={isFetching && hasData} label={messages.loading} />
      <div data-slot="query-detail-content" className={contentClassName}>
        {body()}
      </div>
    </div>
  );
}
