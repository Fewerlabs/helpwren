"use client";

import { type ArticleSummary } from "@helpwren/core";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  EmptyState,
  Icon,
  Kbd,
  QueryList,
  SearchField,
} from "@helpwren/design-system";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import { useDebounced } from "@/lib/use-debounced";

import { getReaderClient } from "../client";
import {
  useHideSearch,
  useSearchInitial,
  useSearchOpen,
  useShowSearch,
} from "../store/search-store";
import { articlePath, searchPath } from "../urls";

/** How many articles the window shows. The results page has the rest. */
const SHOWN = 8;

function Result({ article, onOpen }: { article: ArticleSummary; onOpen: () => void }) {
  if (!article.collection) return null;
  return (
    <Link
      href={articlePath(article.collection.slug, article.slug)}
      data-search-result
      onClick={onOpen}
      className="hover:bg-muted focus-visible:bg-muted focus-visible:outline-ring flex items-start gap-3 rounded-lg px-3 py-2.5 outline-none focus-visible:outline-2"
    >
      <Icon name="file-text" className="text-muted-foreground mt-0.5 size-4 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-pretty">{article.title}</span>
        <span className="text-muted-foreground block truncate text-xs">
          {article.collection.name}
          {article.summary ? ` · ${article.summary}` : ""}
        </span>
      </span>
    </Link>
  );
}

/**
 * The help center's search, as a window over the page that finds articles as the reader
 * types, as Featurebase and the docs sites people know do. ⌘K or Ctrl+K opens it from
 * anywhere; the arrow keys move through what it found; Enter on the words goes to every result.
 */
export function SearchDialog({ placeholder }: { placeholder: string }) {
  const router = useRouter();
  const open = useSearchOpen();
  const initial = useSearchInitial();
  const show = useShowSearch();
  const hide = useHideSearch();
  const [text, setText] = useState(initial);
  const query = useDebounced(text, 150).trim();
  const results = useRef<HTMLDivElement>(null);

  // Each time it opens it starts from what the reader had typed, if anything.
  const [openedWith, setOpenedWith] = useState<string | null>(null);
  if (open && openedWith !== initial) {
    setOpenedWith(initial);
    setText(initial);
  }
  if (!open && openedWith !== null) setOpenedWith(null);

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        show();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [show]);

  /** Moves between the results with the arrow keys, starting from the search box. */
  function move(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const links = [
      ...(results.current?.querySelectorAll<HTMLElement>("[data-search-result]") ?? []),
    ];
    if (links.length === 0) return;
    event.preventDefault();
    const at = links.indexOf(document.activeElement as HTMLElement);
    const next =
      event.key === "ArrowDown" ? Math.min(at + 1, links.length - 1) : at <= 0 ? -1 : at - 1;
    if (next === -1) event.currentTarget.querySelector("input")?.focus();
    else links[next]?.focus();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) hide();
      }}
    >
      <DialogContent
        hideClose
        className="top-[12vh] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl"
        onKeyDown={move}
      >
        <DialogTitle className="sr-only">Search the help center</DialogTitle>
        {/* The window puts the keyboard in the first thing it holds: this box. */}
        <div className="border-rule border-b p-3">
          <SearchField
            aria-label={placeholder}
            placeholder={placeholder}
            value={text}
            onValueChange={setText}
            className="border-transparent text-base shadow-none focus-within:border-transparent"
            onSearch={(value) => {
              if (!value.trim()) return;
              hide();
              router.push(searchPath(value.trim()));
            }}
          />
        </div>
        <div ref={results} className="max-h-[60vh] overflow-y-auto p-2">
          {query ? (
            <QueryList
              queryKey={["help-center", "search", query]}
              queryFn={async () => ({
                items: await getReaderClient().articles.search(query, {
                  visibility: "public",
                  limit: SHOWN,
                }),
              })}
              pagination="none"
              getItemKey={(article) => article.id}
              renderItem={(article) => <Result article={article} onOpen={hide} />}
              renderLoading={() => (
                <p className="text-muted-foreground px-3 py-6 text-center text-sm">Searching…</p>
              )}
              renderEmpty={() => (
                <EmptyState
                  scene="no-results"
                  bird={false}
                  size="sm"
                  className="py-6"
                  title="Nothing matched those words"
                  description="Try fewer or different words."
                />
              )}
              footer={
                <Link
                  href={searchPath(query)}
                  onClick={hide}
                  data-search-result
                  className="text-primary hover:bg-muted focus-visible:bg-muted focus-visible:outline-ring mt-1 flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium outline-none focus-visible:outline-2"
                >
                  <Icon name="magnifying-glass" className="size-4" />
                  See every result for “{query}”
                </Link>
              }
            />
          ) : (
            <p className="text-muted-foreground px-3 py-6 text-center text-sm">
              Type to search every article.
            </p>
          )}
        </div>
        <p className="border-rule text-muted-foreground flex items-center gap-4 border-t px-4 py-2 text-xs max-sm:hidden">
          <span className="flex items-center gap-1.5">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> to move
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>Enter</Kbd> to open
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>Esc</Kbd> to close
          </span>
        </p>
      </DialogContent>
    </Dialog>
  );
}
