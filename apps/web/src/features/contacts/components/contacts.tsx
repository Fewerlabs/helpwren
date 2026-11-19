"use client";

import {
  type ContactDevice,
  type ContactSeen,
  type ContactSummary,
  type ListContactsOptions,
} from "@helpwren/core";
import {
  Avatar,
  cn,
  type DataTableColumn,
  EmptyState,
  FilterBar,
  type FilterDefinition,
  type FilterValue,
  QueryTable,
  RowLink,
  SearchField,
} from "@helpwren/design-system";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { DashboardPage, Panel, PanelHeader } from "@/features/dashboard";
import { countryFlag, countryName } from "@/features/visitors";
import { formatTimeAgo } from "@/lib/format-time";
import { useHelpwren } from "@/lib/helpwren-context";
import { useListParams, type ListParamsOptions } from "@/lib/use-list-params";

import { contactLabel } from "../contact-label";
import {
  CONTACTS_QUERY_KEY,
  contactSegments,
  segmentHref,
  type ContactSegment,
  SEGMENT,
  useSegmentCounts,
  useSelectedContact,
} from "../hooks/use-contacts";
import { ContactDetails } from "./contact-details";
import { KindBadge } from "./kind-badge";

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

// Outside the component, so the address is read against the same options every render.
const listOptions: ListParamsOptions<{ [SEGMENT]: ContactSegment["id"] }> = {
  filters: ["country", "device", "seen", "conversations", "verified"],
  pageSizeKey: "contacts",
  params: {
    [SEGMENT]: { values: contactSegments.map((segment) => segment.id), default: "everyone" },
  },
};

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
 * and page through, and one person's details and conversations beside it. The segment, search,
 * filters, page and rows per page live in the address, so a link opens the same view.
 */
export function Contacts() {
  const getClient = useHelpwren();
  const list = useListParams(listOptions);
  const segment =
    contactSegments.find((item) => item.id === list.params[SEGMENT]) ?? contactSegments[0];
  const counts = useSegmentCounts();
  const [selectedId, select] = useSelectedContact();
  const filterOptions = toOptions(list.filters);

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
            <RowLink
              leading={<Avatar name={label} size="sm" className="text-2xs size-6" />}
              aria-current={contact.id === selectedId ? "true" : undefined}
              onClick={() => {
                select(contact.id);
              }}
            >
              {label}
            </RowLink>
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
      <Panel aria-label={segment.label} className={cn(selectedId && "max-lg:hidden")}>
        <QueryTable
          // A new search, filter or segment changes the key, which starts the list on page 1.
          queryKey={[...CONTACTS_QUERY_KEY, "list", segment.id, list.query, filterOptions]}
          queryFn={({ page, pageSize }) =>
            getClient().contacts.list({
              ...filterOptions,
              kind: segment.kind,
              search: list.query,
              page,
              pageSize,
            })
          }
          page={list.page}
          onPageChange={list.setPage}
          pageSize={list.pageSize}
          onPageSizeChange={list.setPageSize}
          noun={{ one: "contact", other: "contacts" }}
          caption="Contacts"
          density="compact"
          columns={columns}
          getRowKey={(contact) => contact.id}
          rowProps={(contact) => (contact.id === selectedId ? { className: "bg-muted" } : {})}
          filtered={list.narrowed}
          empty={
            <EmptyState
              scene="visitors"
              size="sm"
              className="py-10"
              title="No contacts yet"
              description="People appear here once they have written to you."
            />
          }
          messages={{ error: "Contacts could not be loaded.", pagination: "Contacts pages" }}
          toolbar={({ total, isFetching }) => (
            <>
              <PanelHeader className="justify-between">
                <h2 className="flex items-baseline gap-1.5 font-semibold">
                  {segment.label}
                  {total === undefined ? null : (
                    <span className="text-muted-foreground text-xs font-normal tabular-nums">
                      {total}
                    </span>
                  )}
                </h2>
                <SearchField
                  aria-label="Search contacts"
                  placeholder="Search by name, email or phone"
                  // Quiet, like the inbox search: a tint with no edge.
                  className="bg-muted dark:bg-muted min-h-8 w-72 border-transparent max-sm:w-44"
                  value={list.search}
                  onValueChange={list.setSearch}
                  loading={isFetching && list.query !== ""}
                />
              </PanelHeader>
              <div className="border-rule border-b px-3 py-2">
                <FilterBar
                  filters={definitions}
                  value={list.filters}
                  onValueChange={list.setFilters}
                />
              </div>
            </>
          )}
        />
      </Panel>

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
