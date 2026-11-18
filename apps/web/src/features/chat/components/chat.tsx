"use client";

import { type Message, type PublicSettings } from "@helpwren/core";
import { Avatar, Skeleton } from "@helpwren/design-system";
import { useCallback } from "react";

import { Thread } from "@/features/conversation";
import { HelpwrenProvider } from "@/lib/helpwren-context";

import { getChatClient } from "../client";
import {
  useConversations,
  useLiveConversations,
  useRefreshConversations,
  useSession,
} from "../hooks/use-chat";
import { useScreen, useShowScreen, useTab } from "../store/chat-store";
import { HomeScreen } from "./home-screen";
import { MessagesScreen } from "./messages-screen";
import { ScreenHeader } from "./screen-header";
import { StartForm } from "./start-form";
import { TabBar } from "./tab-bar";

export interface ChatProps {
  settings: PublicSettings;
  /** Where the chat is embedded, such as `web`. One of the install's sources. */
  source: string;
}

function Screens({ settings, source }: ChatProps) {
  const screen = useScreen();
  const tab = useTab();
  const show = useShowScreen();
  const session = useSession();
  const conversations = useConversations();
  const refresh = useRefreshConversations();
  useLiveConversations(session.data?.id);

  const contactId = session.data?.id;
  const isOwn = useCallback((message: Message) => message.senderId === contactId, [contactId]);

  const teamName = settings.brand.name;
  const earlier = conversations.data ?? [];
  const unread = earlier.reduce((total, item) => total + item.unreadForContact, 0);
  const back = () => {
    show({ name: tab });
  };

  if (session.isPending || (Boolean(session.data) && conversations.isPending)) {
    return (
      <div className="grid gap-3 p-5" aria-busy="true" aria-label="Loading">
        <Skeleton className="size-8 rounded-full" />
        <Skeleton className="mt-8 h-14 w-2/3" />
        <Skeleton className="h-12" />
      </div>
    );
  }

  if (screen.name === "conversation" && contactId) {
    return (
      <>
        <ScreenHeader
          onBack={back}
          title={
            <>
              <Avatar name={teamName} size="sm" className="text-2xs size-6" />
              <span className="truncate">{teamName}</span>
            </>
          }
        />
        <Thread
          key={screen.id}
          conversationId={screen.id}
          isOwn={isOwn}
          otherName={teamName}
          onRead={refresh}
        />
      </>
    );
  }

  if (screen.name === "start") {
    return (
      <>
        <ScreenHeader onBack={back} title="New conversation" />
        <div className="min-h-0 flex-1 overflow-y-auto">
          <StartForm
            guestDetails={settings.guestDetails}
            defaultCountry={settings.defaultCountry}
            source={source}
            returning={earlier.length > 0}
          />
        </div>
      </>
    );
  }

  return (
    <>
      {screen.name === "messages" ? (
        <MessagesScreen conversations={earlier} teamName={teamName} />
      ) : (
        <HomeScreen teamName={teamName} recent={earlier[0]} />
      )}
      <TabBar current={screen.name === "messages" ? "messages" : "home"} unread={unread} />
    </>
  );
}

/**
 * The visitor's side of Helpwren: a home screen, their messages, and the conversations
 * themselves. It fills whatever box it is given, so it works in the widget's frame and in a
 * mobile app's web view.
 */
export function Chat(props: ChatProps) {
  return (
    <HelpwrenProvider getClient={getChatClient}>
      <div className="bg-background flex h-dvh flex-col">
        <Screens {...props} />
      </div>
    </HelpwrenProvider>
  );
}
