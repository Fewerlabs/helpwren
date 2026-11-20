"use client";

import { Icon, Logo } from "@helpwren/design-system";
import { useStaticSearch } from "fumadocs-core/search/client/orama-static";
import {
  SearchDialog,
  SearchDialogClose,
  SearchDialogContent,
  SearchDialogHeader,
  SearchDialogIcon,
  SearchDialogInput,
  SearchDialogList,
  SearchDialogOverlay,
  type SharedProps,
} from "fumadocs-ui/components/dialog/search";
import type { ComponentProps } from "react";

import { DeferredThemeMenu } from "@/components/deferred";

/** The search index, written at build by `app/docs/search.json`. */
export const SEARCH_INDEX_URL = "/docs/search.json";

/** Search across every page, from an index the browser downloads once and searches itself. */
export function DocsSearchDialog(props: SharedProps) {
  const search = useStaticSearch({ from: SEARCH_INDEX_URL });
  return (
    <SearchDialog {...search} {...props}>
      <SearchDialogOverlay />
      <SearchDialogContent>
        <SearchDialogHeader>
          <SearchDialogIcon />
          <SearchDialogInput placeholder="Search the docs" />
          <SearchDialogClose />
        </SearchDialogHeader>
        <SearchDialogList />
      </SearchDialogContent>
    </SearchDialog>
  );
}

/** The name at the top of the sidebar: the logo, which goes home, and "Docs". */
export function DocsNavTitle({ className, ...props }: ComponentProps<"a">) {
  return (
    <span className="flex items-center gap-2">
      <a {...props} href="/" className={className} aria-label="Helpwren, home">
        <Logo variant="lockup" size={24} label="" />
      </a>
      <span aria-hidden="true" className="text-muted-foreground">
        /
      </span>
      <a href="/docs" className="text-sm font-medium hover:underline">
        Docs
      </a>
    </span>
  );
}

const themeButton =
  "text-muted-foreground hover:text-foreground hover:bg-muted grid size-9 place-items-center rounded-lg";

/** The site's own theme menu, so the choice is shared with the home page. */
export function DocsThemeSwitch() {
  return (
    <DeferredThemeMenu
      side="top"
      align="start"
      className={themeButton}
      fallback={
        <span aria-hidden="true" className={themeButton}>
          <Icon name="sun" className="size-4 dark:hidden" />
          <Icon name="moon" className="hidden size-4 dark:block" />
        </span>
      }
    />
  );
}
