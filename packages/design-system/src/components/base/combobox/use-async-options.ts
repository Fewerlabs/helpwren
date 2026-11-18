import { useCallback, useEffect, useRef, useState } from "react";

export interface ComboboxLoadRequest<Cursor> {
  /** What the person typed. Empty for the initial list. */
  search: string;
  /** `undefined` for the first page, then whatever the previous page returned as `nextCursor`. */
  cursor: Cursor | undefined;
  /** Aborted when the search changes or the component unmounts. Pass it to `fetch`. */
  signal: AbortSignal;
}

export interface ComboboxPage<Option, Cursor> {
  options: readonly Option[];
  /** Anything that identifies the next page: a page number, an offset, an opaque token. Leave it out on the last page. */
  nextCursor?: Cursor | null | undefined;
}

export type ComboboxLoader<Option, Cursor = unknown> = (
  request: ComboboxLoadRequest<Cursor>,
) => Promise<ComboboxPage<Option, Cursor>>;

export type AsyncStatus = "idle" | "loading" | "loading-more" | "error";

interface State<Option, Cursor> {
  options: readonly Option[];
  cursor: Cursor | undefined;
  hasMore: boolean;
  status: AsyncStatus;
  /** The search the current options belong to; `null` before the first load. */
  loadedSearch: string | null;
}

interface AsyncOptions<Option> {
  options: readonly Option[];
  status: AsyncStatus;
  hasMore: boolean;
  loadMore: () => void;
  retry: () => void;
}

/**
 * Loads options page by page for a search term. Each new search aborts the one
 * before it, so a slow early response can never overwrite a later one.
 */
export function useAsyncOptions<Option, Cursor>({
  loader,
  search,
  enabled,
  debounceMs,
}: {
  loader: ComboboxLoader<Option, Cursor> | undefined;
  search: string;
  enabled: boolean;
  debounceMs: number;
}): AsyncOptions<Option> {
  const [state, setState] = useState<State<Option, Cursor>>({
    options: [],
    cursor: undefined,
    hasMore: false,
    status: "idle",
    loadedSearch: null,
  });
  const request = useRef<AbortController | null>(null);
  // What the newest finished page says. `loadMore` reads this rather than render state, so a
  // scroll event that fires before React has re-rendered can never repeat or skip a page.
  const latest = useRef<{ search: string; cursor: Cursor | undefined; hasMore: boolean }>({
    search: "",
    cursor: undefined,
    hasMore: false,
  });
  const busy = useRef(false);

  const load = useCallback(
    async (term: string, cursor: Cursor | undefined, append: boolean) => {
      if (!loader) {
        return;
      }
      request.current?.abort();
      const controller = new AbortController();
      request.current = controller;
      busy.current = true;
      // Options already on screen stay there while the new ones load.
      setState((previous) => ({ ...previous, status: append ? "loading-more" : "loading" }));

      try {
        const page = await loader({ search: term, cursor, signal: controller.signal });
        if (controller.signal.aborted) {
          return;
        }
        const hasMore = page.nextCursor !== undefined && page.nextCursor !== null;
        latest.current = { search: term, cursor: page.nextCursor ?? undefined, hasMore };
        busy.current = false;
        setState((previous) => ({
          options: append ? [...previous.options, ...page.options] : page.options,
          cursor: page.nextCursor ?? undefined,
          hasMore,
          status: "idle",
          loadedSearch: term,
        }));
      } catch {
        if (!controller.signal.aborted) {
          busy.current = false;
          setState((previous) => ({ ...previous, status: "error", loadedSearch: term }));
        }
      }
    },
    [loader],
  );

  const { loadedSearch } = state;
  useEffect(() => {
    if (!enabled || !loader || loadedSearch === search) {
      return undefined;
    }
    // The first list loads at once; later searches wait for a pause in typing.
    const timer = setTimeout(
      () => {
        void load(search, undefined, false);
      },
      loadedSearch === null ? 0 : debounceMs,
    );
    return () => {
      clearTimeout(timer);
    };
  }, [enabled, loader, search, loadedSearch, debounceMs, load]);

  useEffect(
    () => () => {
      request.current?.abort();
    },
    [],
  );

  const loadMore = useCallback(() => {
    if (latest.current.hasMore && !busy.current) {
      void load(latest.current.search, latest.current.cursor, true);
    }
  }, [load]);

  const retry = useCallback(() => {
    const append = state.options.length > 0;
    void load(search, append ? state.cursor : undefined, append);
  }, [load, search, state.cursor, state.options.length]);

  return {
    options: state.options,
    status: state.status,
    hasMore: state.hasMore,
    loadMore,
    retry,
  };
}
