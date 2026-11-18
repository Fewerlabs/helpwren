"use client";

import { type Agent } from "@helpwren/core";
import { cn, EmptyState, Sheet, SheetContent, SheetTitle } from "@helpwren/design-system";
import { useMemo, useState } from "react";

import { DashboardPage, Panel } from "@/features/dashboard";
import { useDebounced } from "@/lib/use-debounced";

import {
  inboxViews,
  TICKETS_VIEW,
  teamView,
  MIN_SEARCH_LENGTH,
  useChangeConversation,
  useChangeConversations,
  useInboxStatus,
  useInboxView,
  useOpenConversation,
  useLiveInbox,
  useRefreshInbox,
  useSelectedConversation,
  useShowConversation,
  useTeam,
  useTeams,
  useViewCounts,
  viewHref,
} from "../hooks/use-inbox";
import { ConversationPanel } from "./conversation-panel";
import { DetailsPanel } from "./details-panel";
import { ListPanel } from "./list-panel";
import { TicketTable } from "./ticket-table";

/** From this width the details sit beside the conversation. Matches the `xl` breakpoint. */
const WIDE = "(min-width: 80rem)";

/**
 * The team's inbox: its views down the side, then the list of conversations, the open one, and
 * details about who it is with, as columns of one surface. Narrower screens drop the details,
 * then show one column at a time.
 */
export interface InboxProps {
  /** The signed-in team member, for the view of what is assigned to them. */
  agent: Agent;
}

export function Inbox({ agent }: InboxProps) {
  const team = useTeam().data ?? [];
  const teams = useTeams().data;
  // The built-in views, then one for each team.
  const views = useMemo(() => [...inboxViews, ...(teams ?? []).map(teamView)], [teams]);
  const view = useInboxView(views);
  const counts = useViewCounts(views, agent.id);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [detailsSheetOpen, setDetailsSheetOpen] = useState(false);
  const [status, setStatus] = useInboxStatus();
  const [selectedId, select] = useSelectedConversation();
  const [search, setSearch] = useState("");
  const typed = useDebounced(search).trim();
  const searchText = typed.length >= MIN_SEARCH_LENGTH ? typed : "";
  const searching = searchText !== "";
  const refresh = useRefreshInbox();
  const show = useShowConversation();
  useLiveInbox();

  const loaded = useOpenConversation(selectedId).data;
  const selected = loaded?.id === selectedId ? loaded : undefined;
  const change = useChangeConversation(selectedId ?? "");
  const changeAny = useChangeConversations();

  // Tickets are tracked more than chatted through, so their view is a table with no list
  // beside it. Opening one shows its conversation in the table's place.
  const asTable = view.id === TICKETS_VIEW && !searching;

  const openConversation = selected ? (
    <>
      <ConversationPanel
        conversation={selected}
        team={team}
        agentId={agent.id}
        backAlways={asTable}
        onRead={refresh}
        onBack={() => {
          select(null);
        }}
        detailsOpen={detailsOpen}
        onToggleDetails={() => {
          // Beside the conversation where there is room; over it, as a sheet, where there is not.
          if (window.matchMedia(WIDE).matches) setDetailsOpen((open) => !open);
          else setDetailsSheetOpen(true);
        }}
      />
      {detailsOpen ? (
        <DetailsPanel
          conversation={selected}
          team={team}
          teams={teams ?? []}
          onChange={change.mutate}
          className="max-xl:hidden"
        />
      ) : null}
      <Sheet open={detailsSheetOpen} onOpenChange={setDetailsSheetOpen}>
        <SheetContent className="w-80 max-w-[90vw] gap-0 p-0 text-[0.8125rem] xl:hidden">
          <SheetTitle className="sr-only">Details</SheetTitle>
          <DetailsPanel
            conversation={selected}
            team={team}
            teams={teams ?? []}
            onChange={change.mutate}
          />
        </SheetContent>
      </Sheet>
    </>
  ) : null;

  const nav = views.map((item) => ({
    href: viewHref(item),
    label: item.label,
    icon: item.icon,
    count: counts[item.id],
    active: item.id === view.id,
    // Whose conversations first, then other ways of looking at them, then each team.
    ...(item.id.startsWith("team:")
      ? { group: "Teams" }
      : item.id === TICKETS_VIEW
        ? { group: "Views" }
        : {}),
  }));
  const columns = cn(
    "divide-rule grid divide-x",
    selected && detailsOpen && "xl:grid-cols-[minmax(0,1fr)_17rem]",
  );

  if (asTable) {
    return (
      <DashboardPage title="Inbox" navLabel="Inbox views" nav={nav} className={columns}>
        {openConversation ?? (
          <TicketTable
            team={team}
            teams={teams ?? []}
            onOpen={select}
            onChange={(id, changes) => {
              changeAny.mutate({ id, changes });
            }}
          />
        )}
      </DashboardPage>
    );
  }

  return (
    <DashboardPage
      title="Inbox"
      navLabel="Inbox views"
      nav={nav}
      listHiddenWhenNarrow={Boolean(selected)}
      list={
        <ListPanel
          className="min-h-0 flex-1"
          view={view}
          agentId={agent.id}
          team={team}
          count={counts[view.id]}
          status={status}
          onStatusChange={setStatus}
          search={search}
          onSearchChange={setSearch}
          searchText={searchText}
          selectedId={selectedId}
          onSelect={(conversation) => {
            show(conversation);
            select(conversation.id);
          }}
        />
      }
      className={columns}
    >
      {openConversation ?? (
        <Panel aria-label="Conversation">
          <EmptyState
            scene="conversations"
            size="sm"
            className="m-auto"
            title="Choose a conversation"
            description="Pick one from the list to read it and reply."
          />
        </Panel>
      )}
    </DashboardPage>
  );
}
