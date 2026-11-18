"use client";

import { type Agent } from "@helpwren/core";
import { cn, EmptyState } from "@helpwren/design-system";
import { useState } from "react";

import { DashboardPage, Panel } from "@/features/dashboard";
import { useDebounced } from "@/lib/use-debounced";

import {
  inboxViews,
  MIN_SEARCH_LENGTH,
  useChangeConversation,
  useConversationSearch,
  useInboxConversations,
  useInboxView,
  useOpenConversation,
  useLiveInbox,
  useRefreshInbox,
  useSelectedConversation,
  useTeam,
  useViewCounts,
  viewHref,
} from "../hooks/use-inbox";
import { ConversationPanel } from "./conversation-panel";
import { DetailsPanel } from "./details-panel";
import { ListPanel } from "./list-panel";

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
  const view = useInboxView();
  const counts = useViewCounts(agent.id);
  const team = useTeam().data ?? [];
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [selectedId, select] = useSelectedConversation();
  const [search, setSearch] = useState("");
  const searchText = useDebounced(search);
  const searching = searchText.trim().length >= MIN_SEARCH_LENGTH;
  const inView = useInboxConversations(view, agent.id);
  const found = useConversationSearch(searchText);
  const conversations = searching ? found : inView;
  const refresh = useRefreshInbox();
  useLiveInbox();

  // From the list while it is there, for an instant open; otherwise loaded by its id.
  const loaded = useOpenConversation(selectedId).data;
  const selected =
    selectedId === null
      ? undefined
      : (conversations.data?.find((item) => item.id === selectedId) ??
        (loaded?.id === selectedId ? loaded : undefined));
  const change = useChangeConversation(selectedId ?? "");

  return (
    <DashboardPage
      title="Inbox"
      navLabel="Inbox views"
      nav={inboxViews.map((item) => ({
        href: viewHref(item),
        label: item.label,
        icon: item.icon,
        count: counts[item.id],
        active: item.id === view.id,
      }))}
      listHiddenWhenNarrow={Boolean(selected)}
      list={
        <ListPanel
          className="min-h-0 flex-1"
          view={view}
          search={search}
          onSearchChange={setSearch}
          searching={searching}
          loading={conversations.isFetching}
          conversations={conversations.data}
          failed={conversations.isError}
          onRetry={() => {
            void conversations.refetch();
          }}
          selectedId={selectedId}
          onSelect={select}
        />
      }
      className={cn(
        "divide-rule grid divide-x",
        selected && detailsOpen && "xl:grid-cols-[minmax(0,1fr)_17rem]",
      )}
    >
      {selected ? (
        <>
          <ConversationPanel
            conversation={selected}
            team={team}
            onRead={refresh}
            onBack={() => {
              select(null);
            }}
            detailsOpen={detailsOpen}
            onToggleDetails={() => {
              setDetailsOpen((open) => !open);
            }}
          />
          {detailsOpen ? (
            <DetailsPanel
              conversation={selected}
              team={team}
              onChange={change.mutate}
              className="max-xl:hidden"
            />
          ) : null}
        </>
      ) : (
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
