"use client";

import { cn, EmptyState } from "@helpwren/design-system";
import { useState } from "react";

import { Panel } from "@/features/dashboard";

import {
  useInboxConversations,
  useLiveInbox,
  useRefreshInbox,
  useSelectedConversation,
  type InboxFilter,
} from "../hooks/use-inbox";
import { ConversationPanel } from "./conversation-panel";
import { DetailsPanel } from "./details-panel";
import { ListPanel } from "./list-panel";

function Panels() {
  const [filter, setFilter] = useState<InboxFilter>("open");
  const [selectedId, select] = useSelectedConversation();
  const conversations = useInboxConversations(filter);
  const refresh = useRefreshInbox();
  useLiveInbox();

  const selected = conversations.data?.find((item) => item.id === selectedId);

  return (
    <div className="grid min-h-0 flex-1 gap-3 md:grid-cols-[20rem_minmax(0,1fr)] xl:grid-cols-[20rem_minmax(0,1fr)_18rem]">
      <ListPanel
        // On a narrow screen the list and the conversation take turns.
        className={cn(selected && "max-md:hidden")}
        conversations={conversations.data}
        failed={conversations.isError}
        onRetry={() => {
          void conversations.refetch();
        }}
        filter={filter}
        onFilterChange={setFilter}
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
          />
          <DetailsPanel conversation={selected} className="max-xl:hidden" />
        </>
      ) : (
        <Panel aria-label="Conversation" className="max-md:hidden xl:col-span-2">
          <EmptyState
            scene="conversations"
            className="m-auto"
            title="Choose a conversation"
            description="Pick one from the list to read it and reply."
          />
        </Panel>
      )}
    </div>
  );
}

/**
 * The team's inbox: the list of conversations, the open one, and details about who it is with,
 * as three panels side by side. Narrower screens drop the details, then show one panel at a
 * time. It fills the space the dashboard gives it.
 */
export function Inbox() {
  return (
    <div className="flex h-full flex-col p-3">
      <Panels />
    </div>
  );
}
