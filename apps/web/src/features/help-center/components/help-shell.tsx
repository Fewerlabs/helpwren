import { type PublicSettings } from "@helpwren/core";
import { type ReactNode } from "react";

import { type HelpEmbed } from "@/lib/help-embed";

import { BrowseDrawer } from "./browse-drawer";
import { HelpFooter } from "./help-footer";
import { HelpHeader, searchPlaceholder } from "./help-header";
import { HelpSidebar, type HelpSidebarProps, type NavCollection } from "./help-sidebar";
import { SearchBox } from "./search-box";
import { SearchDialog } from "./search-dialog";

export interface HelpShellProps {
  settings: PublicSettings;
  collections: readonly NavCollection[];
  current?: HelpSidebarProps["current"];
  /** What was searched for, kept in the search box. */
  query?: string | undefined;
  /** A column to the right of the page, such as an article's table of contents. */
  aside?: ReactNode;
  /** True on the home page, whose own large search replaces the one in the top bar. */
  home?: boolean;
  /** Set when the help center is inside a frame on a host's site. */
  embed?: HelpEmbed | null;
  /**
   * Draws the page without anything in it working, for the preview in Branding, where
   * following a link would leave the form.
   */
  inert?: boolean;
  children: ReactNode;
}

/**
 * The frame of every help center page, laid out as documentation is: a bar across the top, the
 * whole list of articles down the left, the page in the middle, and room on the right for an
 * article's contents. On a narrow screen the list slides in over the page from a button in the bar.
 *
 * Inside a host's frame none of that is drawn: only the search, if wanted, and the page.
 */
export function HelpShell({
  settings,
  collections,
  current,
  query,
  aside,
  home = false,
  embed = null,
  inert = false,
  children,
}: HelpShellProps) {
  if (embed) {
    return (
      <>
        {embed.hide.includes("search") ? null : (
          <header className="mx-auto w-full max-w-3xl px-4 pt-4">
            <SearchBox
              placeholder={searchPlaceholder(settings)}
              query={query}
              size="sm"
              embed={embed}
            />
          </header>
        )}
        <main className="mx-auto w-full max-w-3xl px-4 py-5">{children}</main>
      </>
    );
  }

  return (
    <div inert={inert} className="flex min-h-full flex-1 flex-col">
      <HelpHeader
        settings={settings}
        query={query}
        search={!home}
        // On a narrow screen the list of articles slides in over the page from this button.
        browse={
          <BrowseDrawer>
            <HelpSidebar collections={collections} current={current} />
          </BrowseDrawer>
        }
      />

      {/* On a phone the search has a row of its own under the bar. */}
      {home ? null : (
        <div className="border-rule border-b px-4 py-2.5 md:hidden">
          <SearchBox placeholder={searchPlaceholder(settings)} query={query} size="sm" />
        </div>
      )}

      <div className="mx-auto flex w-full max-w-[90rem] flex-1">
        <aside className="sticky top-14 h-[calc(100dvh-3.5rem)] w-72 shrink-0 overflow-y-auto px-4 py-8 max-lg:hidden">
          <HelpSidebar collections={collections} current={current} />
        </aside>
        <div className="min-w-0 flex-1 px-5 py-8 sm:px-10 sm:py-10">
          <main className="mx-auto max-w-3xl">{children}</main>
          <div className="mx-auto max-w-3xl">
            <HelpFooter settings={settings} />
          </div>
        </div>
        {/* Kept even when empty, so the page sits in the same place on every screen. */}
        <aside className="sticky top-14 h-[calc(100dvh-3.5rem)] w-64 shrink-0 overflow-y-auto px-4 py-10 max-xl:hidden">
          {aside}
        </aside>
      </div>
      {inert ? null : <SearchDialog placeholder={searchPlaceholder(settings)} />}
    </div>
  );
}
