"use client";

import { Button, cn, EmptyState, SearchField, Skeleton } from "@helpwren/design-system";
import { useState } from "react";

import { DashboardPage, Panel, PanelHeader } from "@/features/dashboard";
import { useDebounced } from "@/lib/use-debounced";

import {
  contactSegments,
  PAGE_SIZE,
  segmentHref,
  useContact,
  useContacts,
  useContactSegment,
  useSegmentCounts,
  useSelectedContact,
} from "../hooks/use-contacts";
import { ContactDetails } from "./contact-details";
import { ContactTable } from "./contact-table";

/**
 * Everyone who has written to the team: guests and the host product's users. A table to search
 * and page through, and one person's details and conversations beside it.
 */
export function Contacts() {
  const segment = useContactSegment();
  const counts = useSegmentCounts();
  const [selectedId, select] = useSelectedContact();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const searchText = useDebounced(search).trim();

  // A new search or segment starts from its first page. Resetting while rendering, when the
  // inputs change, avoids showing page 3 of results that only have one page.
  const listKey = `${segment.id}:${searchText}`;
  const [lastListKey, setLastListKey] = useState(listKey);
  if (lastListKey !== listKey) {
    setLastListKey(listKey);
    setPage(1);
  }

  const contacts = useContacts(segment, searchText, page);
  const selected = useContact(selectedId);
  const total = contacts.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <DashboardPage
      title="Contacts"
      navLabel="Contact segments"
      nav={contactSegments.map((item) => ({
        href: segmentHref(item),
        label: item.label,
        icon: item.icon,
        count: counts[item.id],
        active: item.id === segment.id,
      }))}
      className={cn(
        "divide-rule grid divide-x",
        selected.data && "lg:grid-cols-[minmax(0,1fr)_18rem]",
      )}
    >
      <Panel aria-label={segment.label} className={cn(selected.data && "max-lg:hidden")}>
        <PanelHeader className="justify-between">
          <h2 className="flex items-baseline gap-1.5 font-semibold">
            {segment.label}
            {contacts.data ? (
              <span className="text-muted-foreground text-xs font-normal tabular-nums">
                {total}
              </span>
            ) : null}
          </h2>
          <SearchField
            aria-label="Search contacts"
            placeholder="Search by name, email or phone"
            className="w-72 max-sm:w-44"
            value={search}
            onValueChange={setSearch}
            loading={contacts.isFetching && searchText.length > 0}
          />
        </PanelHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {contacts.isError ? (
            <EmptyState
              scene={false}
              size="sm"
              className="pt-10"
              title="Contacts could not be loaded."
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    void contacts.refetch();
                  }}
                >
                  Try again
                </Button>
              }
            />
          ) : !contacts.data ? (
            <div className="grid gap-2 p-4" aria-busy="true" aria-label="Loading contacts">
              <Skeleton className="h-9" />
              <Skeleton className="h-9" />
              <Skeleton className="h-9" />
            </div>
          ) : contacts.data.items.length === 0 ? (
            <EmptyState
              scene={searchText ? false : "conversations"}
              size="sm"
              className="pt-10"
              title={searchText ? "No contacts found" : "No contacts yet"}
              description={
                searchText
                  ? "Try a different name, email address or phone number."
                  : "People appear here once they have written to you."
              }
            />
          ) : (
            <ContactTable
              contacts={contacts.data.items}
              selectedId={selectedId}
              onSelect={select}
            />
          )}
        </div>

        {pageCount > 1 ? (
          <footer className="border-rule flex h-11 shrink-0 items-center justify-between border-t px-3">
            <p className="text-muted-foreground text-xs tabular-nums" aria-live="polite">
              Page {page} of {pageCount}
            </p>
            <div className="flex gap-1.5">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => {
                  setPage(page - 1);
                }}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= pageCount}
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

      {selected.data ? (
        <ContactDetails
          contact={selected.data}
          onClose={() => {
            select(null);
          }}
        />
      ) : null}
    </DashboardPage>
  );
}
