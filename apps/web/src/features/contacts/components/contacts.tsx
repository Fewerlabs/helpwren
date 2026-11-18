"use client";

import { type ContactSummary } from "@helpwren/core";
import {
  Avatar,
  Button,
  cn,
  DataTable,
  type DataTableColumn,
  EmptyState,
  QueryList,
  SearchField,
} from "@helpwren/design-system";
import { useMemo, useState } from "react";

import { DashboardPage, Panel, PanelHeader } from "@/features/dashboard";
import { formatTimeAgo } from "@/lib/format-time";
import { useHelpwren } from "@/lib/helpwren-context";
import { useDebounced } from "@/lib/use-debounced";

import { contactLabel } from "../contact-label";
import {
  CONTACTS_QUERY_KEY,
  contactSegments,
  segmentHref,
  useContactSegment,
  useSegmentCounts,
  useSelectedContact,
} from "../hooks/use-contacts";
import { ContactDetails } from "./contact-details";
import { KindBadge } from "./kind-badge";

const PAGE_SIZE = 25;

/**
 * Everyone who has written to the team: guests and the host product's users. A table to search
 * and page through, and one person's details and conversations beside it.
 */
export function Contacts() {
  const getClient = useHelpwren();
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

  const columns = useMemo<DataTableColumn<ContactSummary>[]>(
    () => [
      {
        id: "name",
        header: "Name",
        rowHeader: true,
        cell: (contact) => {
          const label = contactLabel(contact);
          return (
            <button
              type="button"
              aria-current={contact.id === selectedId ? "true" : undefined}
              className="focus-visible:outline-ring flex max-w-full items-center gap-2.5 rounded-md text-left font-medium focus-visible:outline-2 focus-visible:outline-offset-2"
              onClick={() => {
                select(contact.id);
              }}
            >
              <Avatar name={label} size="sm" className="text-2xs size-6" />
              <span className="truncate">{label}</span>
            </button>
          );
        },
      },
      {
        id: "reach",
        header: "Email or phone",
        className: "text-muted-foreground max-lg:hidden",
        headerClassName: "max-lg:hidden",
        cell: (contact) => contact.email ?? contact.phone ?? "Not given",
      },
      { id: "kind", header: "Type", cell: (contact) => <KindBadge contact={contact} /> },
      {
        id: "conversations",
        header: "Conversations",
        align: "end",
        className: "tabular-nums max-sm:hidden",
        headerClassName: "max-sm:hidden",
        cell: (contact) => contact.conversationCount,
      },
      {
        id: "active",
        header: "Last active",
        align: "end",
        className: "text-muted-foreground tabular-nums",
        cell: (contact) => (contact.lastActiveAt ? formatTimeAgo(contact.lastActiveAt) : "Never"),
      },
    ],
    [select, selectedId],
  );

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
        selectedId && "lg:grid-cols-[minmax(0,1fr)_18rem]",
      )}
    >
      <QueryList
        queryKey={[...CONTACTS_QUERY_KEY, "list", segment.id, searchText]}
        queryFn={({ page: number, pageSize }) =>
          getClient().contacts.list({
            kind: segment.kind,
            search: searchText,
            page: number,
            pageSize,
          })
        }
        pagination="pages"
        pageSize={PAGE_SIZE}
        page={page}
        onPageChange={setPage}
      >
        {(list) => (
          <Panel aria-label={segment.label} className={cn(selectedId && "max-lg:hidden")}>
            <PanelHeader className="justify-between">
              <h2 className="flex items-baseline gap-1.5 font-semibold">
                {segment.label}
                {list.total === undefined ? null : (
                  <span className="text-muted-foreground text-xs font-normal tabular-nums">
                    {list.total}
                  </span>
                )}
              </h2>
              <SearchField
                aria-label="Search contacts"
                placeholder="Search by name, email or phone"
                // Quiet, like the inbox search: a tint with no edge.
                className="bg-muted dark:bg-muted min-h-8 w-72 border-transparent max-sm:w-44"
                value={search}
                onValueChange={setSearch}
                loading={list.isFetching && searchText !== ""}
              />
            </PanelHeader>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {list.status === "error" ? (
                <EmptyState
                  scene={false}
                  size="sm"
                  className="pt-10"
                  title="Contacts could not be loaded."
                  action={
                    <Button variant="secondary" size="sm" onClick={list.retry}>
                      Try again
                    </Button>
                  }
                />
              ) : (
                <DataTable
                  caption="Contacts"
                  density="compact"
                  columns={columns}
                  rows={list.items}
                  getRowKey={(contact) => contact.id}
                  rowProps={(contact) =>
                    contact.id === selectedId ? { className: "bg-muted" } : {}
                  }
                  loading={list.isFetching}
                  empty={
                    <EmptyState
                      scene={searchText ? false : "conversations"}
                      size="sm"
                      className="py-10"
                      title={searchText ? "No contacts found" : "No contacts yet"}
                      description={
                        searchText
                          ? "Try a different name, email address or phone number."
                          : "People appear here once they have written to you."
                      }
                    />
                  }
                />
              )}
            </div>

            {list.pagination && (list.pagination.hasPrevious || list.pagination.hasNext) ? (
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
        )}
      </QueryList>

      {selectedId ? (
        <ContactDetails
          // A fresh panel for each person, so one's scroll position is not the next one's.
          key={selectedId}
          contactId={selectedId}
          onClose={() => {
            select(null);
          }}
        />
      ) : null}
    </DashboardPage>
  );
}
