"use client";

import { type Visitor, type VisitorSettings } from "@helpwren/core";
import {
  Avatar,
  Button,
  cn,
  DataTable,
  type DataTableColumn,
  EmptyState,
  Icon,
  Link,
  Pagination,
  QueryList,
} from "@helpwren/design-system";
import NextLink from "next/link";
import { useMemo } from "react";

import { DashboardPage, Panel, PanelHeader } from "@/features/dashboard";
import { useHelpwren } from "@/lib/helpwren-context";

import {
  browserLabel,
  countryFlag,
  countryName,
  devices,
  formatDuration,
  visitorName,
} from "../format";
import {
  ACTIVE_WITHIN_SECONDS,
  REFRESH_EVERY_MS,
  useSelectedVisitor,
  VISITORS_QUERY_KEY,
} from "../hooks/use-visitors";
import { VisitorDetails } from "./visitor-details";

const SETTINGS_HREF = "/dashboard/settings/general";
const PAGE_SIZE = 25;

export interface VisitorsProps {
  settings: VisitorSettings;
}

/** Why the list is not shown, and where to turn it on. */
function SwitchedOff({ tracking }: { tracking: boolean }) {
  return (
    <EmptyState
      scene="visitors"
      className="h-full"
      title={tracking ? "The live list is switched off" : "Visitor tracking is switched off"}
      description={
        tracking
          ? "Turn on Live visitors in the general settings to see who is on your site and start conversations with them."
          : "The chat is not checking in, so nobody shows here and contacts get no new browser details. Turn on Track visitors in the general settings."
      }
      action={
        <Button asChild variant="secondary" size="sm">
          <NextLink href={SETTINGS_HREF}>Open general settings</NextLink>
        </Button>
      }
    />
  );
}

/**
 * Who is on the site right now: everyone whose chat checked in within the last two minutes,
 * 25 to a page, asked for again every fifteen seconds while the page is open. A refresh keeps
 * the page on screen, or moves back to the last one if people left and it no longer exists. Opening one shows where they
 * are and what they have looked at, and lets the team write to them first.
 */
export function Visitors({ settings }: VisitorsProps) {
  const getClient = useHelpwren();
  const [selectedId, select] = useSelectedVisitor();
  const on = settings.tracking && settings.liveList;

  const columns = useMemo<DataTableColumn<Visitor>[]>(
    () => [
      {
        id: "name",
        header: "Name",
        rowHeader: true,
        cell: (visitor) => {
          const name = visitorName(visitor);
          return (
            <button
              type="button"
              aria-current={visitor.id === selectedId ? "true" : undefined}
              className="focus-visible:outline-ring flex max-w-full items-center gap-2.5 rounded-md text-left font-medium focus-visible:outline-2 focus-visible:outline-offset-2"
              onClick={() => {
                select(visitor.id);
              }}
            >
              <Avatar name={name} size="sm" className="text-2xs size-6" />
              <span className="truncate">{name}</span>
            </button>
          );
        },
      },
      {
        id: "place",
        header: "Location",
        className: "max-md:hidden",
        headerClassName: "max-md:hidden",
        cell: ({ location }) =>
          location.country ? (
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true">{countryFlag(location.country)}</span>
              <span className="truncate">{location.city ?? countryName(location.country)}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">Unknown</span>
          ),
      },
      {
        id: "page",
        header: "Page",
        className: "max-w-64",
        cell: ({ page }) => (
          <Link href={page.url} external className="block truncate">
            {page.title ?? page.url}
          </Link>
        ),
      },
      {
        id: "time",
        header: "On site",
        className: "text-muted-foreground tabular-nums max-sm:hidden",
        headerClassName: "max-sm:hidden",
        cell: (visitor) => formatDuration(visitor.sessionStartedAt),
      },
      {
        id: "device",
        header: "Device",
        className: "text-muted-foreground max-lg:hidden",
        headerClassName: "max-lg:hidden",
        cell: (visitor) => (
          <span className="flex items-center gap-1.5">
            {visitor.device ? (
              <Icon
                name={devices[visitor.device].icon}
                label={devices[visitor.device].label}
                className="size-4 shrink-0"
              />
            ) : null}
            <span className="truncate">{browserLabel(visitor) ?? "Unknown"}</span>
          </span>
        ),
      },
      {
        id: "written",
        header: "Chatted",
        align: "end",
        className: "text-muted-foreground tabular-nums",
        cell: (visitor) => {
          const count = visitor.contact?.conversationCount ?? 0;
          return count === 0 ? "Not yet" : count === 1 ? "Once" : `${count} times`;
        },
      },
    ],
    [select, selectedId],
  );

  return (
    <DashboardPage
      title="Visitors"
      navLabel="Visitor views"
      nav={[{ href: "/dashboard/visitors", label: "Live now", icon: "users-three", active: true }]}
      className={cn(
        "divide-rule grid divide-x",
        selectedId && on && "lg:grid-cols-[minmax(0,1fr)_20rem]",
      )}
    >
      {on ? (
        <QueryList
          queryKey={[...VISITORS_QUERY_KEY, "live"]}
          queryFn={({ page, pageSize }) =>
            getClient().visitors.list({
              activeWithinSeconds: ACTIVE_WITHIN_SECONDS,
              page,
              limit: pageSize,
            })
          }
          pagination="pages"
          pageSize={PAGE_SIZE}
          refetchInterval={REFRESH_EVERY_MS}
        >
          {(list) => (
            <Panel aria-label="Live now" className={cn(selectedId && "max-lg:hidden")}>
              <PanelHeader>
                <h2 className="flex items-baseline gap-1.5 font-semibold">
                  On your site now
                  {list.total === undefined ? null : (
                    <span className="text-muted-foreground text-xs font-normal tabular-nums">
                      {list.total}
                    </span>
                  )}
                </h2>
              </PanelHeader>
              <div className="min-h-0 flex-1 overflow-y-auto">
                {list.status === "error" ? (
                  <EmptyState
                    scene={false}
                    size="sm"
                    className="pt-10"
                    title="Visitors could not be loaded."
                    action={
                      <Button variant="secondary" size="sm" onClick={list.retry}>
                        Try again
                      </Button>
                    }
                  />
                ) : (
                  <DataTable
                    caption="Visitors on your site now"
                    density="compact"
                    columns={columns}
                    rows={list.items}
                    getRowKey={(visitor) => visitor.id}
                    rowProps={(visitor) =>
                      visitor.id === selectedId ? { className: "bg-muted" } : {}
                    }
                    loading={list.status === "loading"}
                    empty={
                      <EmptyState
                        scene="visitors"
                        size="sm"
                        className="py-10"
                        title="No one is on your site right now"
                        description="People show up here while a page with your chat is open. The list refreshes on its own."
                      />
                    }
                  />
                )}
              </div>
              {list.pagination ? (
                <Pagination
                  pagination={list.pagination}
                  noun={{ one: "visitor", other: "visitors" }}
                  messages={{ label: "Visitors pages" }}
                />
              ) : null}
            </Panel>
          )}
        </QueryList>
      ) : (
        <SwitchedOff tracking={settings.tracking} />
      )}

      {on && selectedId ? (
        <VisitorDetails
          key={selectedId}
          visitorId={selectedId}
          onClose={() => {
            select(null);
          }}
        />
      ) : null}
    </DashboardPage>
  );
}
