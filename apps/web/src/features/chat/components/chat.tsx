"use client";

import { type PublicSettings } from "@helpwren/core";
import { Button, Icon, Skeleton } from "@helpwren/design-system";

import { useConversations, useLiveConversationList, useSession } from "../hooks/use-chat";
import { useScreen, useShowScreen } from "../store/chat-store";
import { ConversationList } from "./conversation-list";
import { ConversationView } from "./conversation-view";
import { StartForm } from "./start-form";

export interface ChatProps {
  settings: PublicSettings;
  /** Where the chat is embedded, such as `web`. One of the install's sources. */
  source: string;
}

/**
 * The visitor's side of Helpwren: start a conversation, see earlier ones, and chat. It fills
 * whatever box it is given, so it works in the widget's frame and in a mobile app's web view.
 */
export function Chat({ settings, source }: ChatProps) {
  const screen = useScreen();
  const show = useShowScreen();
  const session = useSession();
  const conversations = useConversations();
  useLiveConversationList(session.data?.id);

  const teamName = settings.brand.name;
  const earlier = conversations.data ?? [];
  const loading = session.isPending || (Boolean(session.data) && conversations.isPending);
  // With nothing to list, the list would be an empty page: go straight to the start form.
  const current =
    screen.name === "list" && earlier.length === 0 ? ({ name: "start" } as const) : screen;
  const canGoBack = current.name !== "list" && earlier.length > 0;

  return (
    <div className="bg-background flex h-dvh flex-col">
      <header className="border-rule flex h-14 shrink-0 items-center gap-2 border-b px-3">
        {canGoBack ? (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Back to your conversations"
            onClick={() => {
              show({ name: "list" });
            }}
          >
            <Icon name="arrow-left" />
          </Button>
        ) : null}
        <h1 className="truncate px-1 text-base font-semibold">{teamName}</h1>
      </header>

      {loading ? (
        <div className="grid gap-3 p-4" aria-busy="true" aria-label="Loading">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : current.name === "conversation" && session.data ? (
        <ConversationView
          key={current.id}
          conversationId={current.id}
          contactId={session.data.id}
          teamName={teamName}
        />
      ) : current.name === "list" ? (
        <ConversationList conversations={earlier} teamName={teamName} />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <p className="text-muted-foreground px-4 pt-4 text-sm">
            Send us a message and we will get back to you.
          </p>
          <StartForm
            guestDetails={settings.guestDetails}
            source={source}
            returning={earlier.length > 0}
          />
        </div>
      )}
    </div>
  );
}
