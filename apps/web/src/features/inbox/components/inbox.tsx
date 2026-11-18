"use client";

import { type Agent } from "@helpwren/core";
import { Avatar, cn, EmptyState, Logo } from "@helpwren/design-system";
import { useState, type ReactNode } from "react";

import { HelpwrenProvider } from "@/lib/helpwren-context";

import { getInboxClient } from "../client";
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
import { Panel } from "./panel";

export interface InboxProps {
  agent: Agent;
  /** The sign-out control, passed in because signing out belongs to another feature. */
  signOut: ReactNode;
}

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
 * as three panels side by side. Narrower screens drop the details, then show one panel at a time.
 */
export function Inbox({ agent, signOut }: InboxProps) {
  return (
    <HelpwrenProvider getClient={getInboxClient}>
      <div className="bg-background flex h-dvh flex-col gap-3 p-3">
        <header className="flex h-9 shrink-0 items-center justify-between gap-3 px-1">
          <Logo variant="lockup" size={22} />
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 text-sm">
              <Avatar name={agent.name} size="sm" className="text-2xs size-6" />
              <span className="max-sm:hidden">{agent.name}</span>
            </span>
            {signOut}
          </div>
        </header>
        <Panels />
      </div>
    </HelpwrenProvider>
  );
}
