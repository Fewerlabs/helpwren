"use client";

import {
  type ContactDevice,
  type ContactSeen,
  type ContactSummary,
  type ListContactsOptions,
} from "@helpwren/core";
import {
  Avatar,
  Button,
  cn,
  DataTable,
  type DataTableColumn,
  EmptyState,
  FilterBar,
  type FilterDefinition,
  type FilterValue,
  Pagination,
  QueryList,
  SearchField,
} from "@helpwren/design-system";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { DashboardPage, Panel, PanelHeader } from "@/features/dashboard";
import { countryFlag, countryName } from "@/features/visitors";
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

const deviceOptions = [
  { value: "desktop", label: "Desktop" },
  { value: "mobile", label: "Phone" },
  { value: "tablet", label: "Tablet" },
];

const seenOptions = [
  { value: "day", label: "Today" },
  { value: "week", label: "Last 7 days" },
  { value: "month", label: "Last 30 days" },
  { value: "never", label: "Never" },
];

/** Turns what the filter bar holds into what the database is asked for. No values means any. */
function toOptions(value: FilterValue): Partial<ListContactsOptions> {
  const chosen = (id: string) => {
    const values = value[id];
    return values && values.length > 0 ? values : undefined;
  };
  // A two-way choice with both sides chosen is the same as no choice.
  const one = (id: string): string | undefined => {
    const values = chosen(id);
    return values?.length === 1 ? values[0] : undefined;
  };
  const verified = one("verified");
  const conversations = one("conversations");
  return {
    countries: chosen("country"),
    devices: chosen("device") as ContactDevice[] | undefined,
    seen: chosen("seen") as ContactSeen[] | undefined,
    verified: verified === undefined ? undefined : verified === "yes",
    conversations: conversations === "some" || conversations === "none" ? conversations : undefined,
  };
}

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
  const [filters, setFilters] = useState<FilterValue>({});
  const searchText = useDebounced(search).trim();
  const filterOptions = useMemo(() => toOptions(filters), [filters]);
  const narrowed = searchText !== "" || Object.values(filters).some((values) => values.length > 0);

  // The countries people have been seen in, so the filter offers only ones that match someone.
  const countries = useQuery({
    queryKey: [...CONTACTS_QUERY_KEY, "countries"],
    queryFn: () => getClient().contacts.countries(),
  }).data;
  const definitions = useMemo<FilterDefinition[]>(
    () => [
      {
        id: "country",
        label: "Country",
        icon: "globe",
        options: (countries ?? []).map((code) => ({
          value: code,
          label: `${countryFlag(code)} ${countryName(code)}`,
        })),
      },
      { id: "device", label: "Device", icon: "device-mobile", options: deviceOptions },
      { id: "seen", label: "Last seen", icon: "clock", options: seenOptions },
      {
        id: "conversations",
        label: "Conversations",
        icon: "chat-circle",
        options: [
          { value: "some", label: "Has written" },
          { value: "none", label: "Has not written" },
        ],
      },
      {
        id: "verified",
        label: "Verified",
        icon: "shield-check",
        options: [
          { value: "yes", label: "Verified" },
          { value: "no", label: "Not verified" },
        ],
      },
    ],
    [countries],
  );

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
        id: "country",
        header: "Country",
        className: "text-muted-foreground max-xl:hidden",
        headerClassName: "max-xl:hidden",
        cell: ({ visitor }) => {
          const country = visitor?.location.country;
          return country ? (
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true">{countryFlag(country)}</span>
              <span className="truncate">{countryName(country)}</span>
            </span>
          ) : (
            "Unknown"
          );
        },
      },
      {
        id: "seen",
        header: "Last seen",
        align: "end",
        className: "text-muted-foreground tabular-nums max-md:hidden",
        headerClassName: "max-md:hidden",
        cell: ({ visitor }) => (visitor?.lastSeenAt ? formatTimeAgo(visitor.lastSeenAt) : "Never"),
      },
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
        // A new search, filter or segment changes the key, which starts the list on page 1.
        queryKey={[...CONTACTS_QUERY_KEY, "list", segment.id, searchText, filterOptions]}
        queryFn={({ page: number, pageSize }) =>
          getClient().contacts.list({
            ...filterOptions,
            kind: segment.kind,
            search: searchText,
            page: number,
            pageSize,
          })
        }
        pagination="pages"
        pageSize={PAGE_SIZE}
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
            <div className="border-rule border-b px-3 py-2">
              <FilterBar filters={definitions} value={filters} onValueChange={setFilters} />
            </div>

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
                      scene={narrowed ? "no-results" : "visitors"}
                      size="sm"
                      className="py-10"
                      title={narrowed ? "No contacts found" : "No contacts yet"}
                      description={
                        narrowed
                          ? "Try a different search, or fewer filters."
                          : "People appear here once they have written to you."
                      }
                    />
                  }
                />
              )}
            </div>

            {list.pagination ? (
              <Pagination
                pagination={list.pagination}
                noun={{ one: "contact", other: "contacts" }}
                messages={{ label: "Contacts pages" }}
              />
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
