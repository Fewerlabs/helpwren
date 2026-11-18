"use client";

import { useQuery, type QueryKey } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { cn } from "#lib/cn";

import {
  DefaultLoading,
  DefaultEmpty,
  DefaultError,
  StickyProgress,
  type QueryBehaviour,
  type QueryErrorContext,
} from "./query-states";

export interface QueryDetailMessages {
  loading: string;
  empty: ReactNode;
  emptyDescription?: ReactNode;
  error: ReactNode;
  retry: string;
}

const defaultMessages: QueryDetailMessages = {
  loading: "Loading",
  empty: "Not found.",
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
 * Fetches a single item and draws every state of it: loading, not found, error
 * with retry, and the item itself. Results are cached by `queryKey` with TanStack
 * Query, so it needs a `QueryClientProvider` above it.
 */
export function QueryDetail<Data>({
  queryKey,
  queryFn,
  children,
  isEmpty,
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
      return renderLoading?.() ?? <DefaultLoading label={messages.loading} />;
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
        <DefaultEmpty
          title={messages.empty}
          {...(messages.emptyDescription === undefined
            ? {}
            : { description: messages.emptyDescription })}
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
