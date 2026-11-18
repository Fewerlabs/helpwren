"use client";

import { cn, EmptyState } from "@helpwren/design-system";
import { useState } from "react";

import { DashboardPage, Panel } from "@/features/dashboard";
import { useDebounced } from "@/lib/use-debounced";

import {
  inboxViews,
  MIN_SEARCH_LENGTH,
  useConversationSearch,
  useInboxConversations,
  useInboxView,
  useLiveInbox,
  useRefreshInbox,
  useSelectedConversation,
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
export function Inbox() {
  const view = useInboxView();
  const counts = useViewCounts();
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [selectedId, select] = useSelectedConversation();
  const [search, setSearch] = useState("");
  const searchText = useDebounced(search);
  const searching = searchText.trim().length >= MIN_SEARCH_LENGTH;
  const inView = useInboxConversations(view);
  const found = useConversationSearch(searchText);
  const conversations = searching ? found : inView;
  const refresh = useRefreshInbox();
  useLiveInbox();

  const selected = conversations.data?.find((item) => item.id === selectedId);

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
      className={cn(
        "divide-rule grid divide-x md:grid-cols-[18.5rem_minmax(0,1fr)]",
        selected && detailsOpen && "xl:grid-cols-[18.5rem_minmax(0,1fr)_17rem]",
      )}
    >
      <ListPanel
        // On a narrow screen the list and the conversation take turns.
        className={cn(selected && "max-md:hidden")}
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
      {selected ? (
        <>
          <ConversationPanel
            conversation={selected}
            onRead={refresh}
            onBack={() => {
              select(null);
            }}
            detailsOpen={detailsOpen}
            onToggleDetails={() => {
              setDetailsOpen((open) => !open);
            }}
          />
          {detailsOpen ? <DetailsPanel conversation={selected} className="max-xl:hidden" /> : null}
        </>
      ) : (
        <Panel aria-label="Conversation" className="max-md:hidden">
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
