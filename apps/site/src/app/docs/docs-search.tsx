"use client";

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

/** The search index, written at build by `app/docs/search.json`. */
const SEARCH_INDEX_URL = "/docs/search.json";

/**
 * Search across every page, from an index the browser downloads once and searches itself. Its
 * code and the index load only when someone opens it.
 */
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
