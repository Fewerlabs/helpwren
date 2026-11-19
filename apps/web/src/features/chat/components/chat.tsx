"use client";

import { type Message, type PublicSettings } from "@helpwren/core";
import { cn, Skeleton } from "@helpwren/design-system";
import { useCallback, useEffect } from "react";

import { Thread } from "@/features/conversation";
import { accentStyle } from "@/lib/accent";
import { HelpwrenProvider } from "@/lib/helpwren-context";

import { BrandProvider, TeamAvatar } from "../brand";
import { getChatClient } from "../client";
import {
  useConversations,
  useLiveConversations,
  useRefreshConversations,
  useSession,
} from "../hooks/use-chat";
import { useEmbedBridge } from "../hooks/use-embed-bridge";
import { usePreviewSettings } from "../hooks/use-preview-settings";
import { usePreview, useScreen, useSetPreview, useShowScreen, useTab } from "../store/chat-store";
import { ArticleScreen, HelpScreen } from "./help-screen";
import { HomeScreen } from "./home-screen";
import { MessagesScreen } from "./messages-screen";
import { RatingPrompt } from "./rating-prompt";
import { ScreenHeader } from "./screen-header";
import { StartForm } from "./start-form";
import { TabBar } from "./tab-bar";
import { TicketBar } from "./ticket-bar";

export interface ChatProps {
  settings: PublicSettings;
  /** Where the chat is embedded, such as `web`. One of the install's sources. */
  source: string;
  /** Shows the chat as a new visitor sees it, follows settings sent to it, and sends nothing. */
  preview?: boolean;
  /** Classes for the chat's box. It fills the screen unless told otherwise. */
  className?: string;
}

function Screens({ settings, source }: Pick<ChatProps, "settings" | "source">) {
  const preview = usePreview();
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
  const bridge = useEmbedBridge(unread);
  const onClose = bridge.embedded && bridge.closable ? bridge.close : undefined;
  // Someone who has written before, or whom the host product vouches for, is not asked who
  // they are.
  const known = earlier.length > 0 || session.data?.isGuest === false;
  const back = () => {
    show({ name: tab });
  };

  if (!preview && (session.isPending || (Boolean(session.data) && conversations.isPending))) {
    return (
      <div className="grid gap-3 p-5" aria-busy="true" aria-label="Loading">
        <Skeleton className="size-8 rounded-full" />
        <Skeleton className="mt-8 h-14 w-2/3" />
        <Skeleton className="h-12" />
      </div>
    );
  }

  if (screen.name === "conversation" && contactId) {
    const open = earlier.find((item) => item.id === screen.id);
    return (
      <>
        <ScreenHeader
          onBack={back}
          onClose={onClose}
          title={
            <>
              <TeamAvatar size="sm" className="text-2xs size-6" />
              <span className="truncate">{teamName}</span>
            </>
          }
        />
        {open?.type === "ticket" ? <TicketBar ticket={open} /> : null}
        <Thread
          key={screen.id}
          conversationId={screen.id}
          isOwn={isOwn}
          otherName={teamName}
          otherAvatar={settings.brand.logo}
          onRead={refresh}
          beforeComposer={
            open && (open.status === "resolved" || open.status === "closed") ? (
              <RatingPrompt conversationId={open.id} />
            ) : null
          }
        />
      </>
    );
  }

  if (screen.name === "article") {
    return <ArticleScreen slug={screen.slug} onBack={back} onClose={onClose} />;
  }

  if (screen.name === "ticket" && settings.tickets.fromChat) {
    return (
      <>
        <ScreenHeader onBack={back} onClose={onClose} title="New ticket" />
        <StartForm
          ticket
          guestDetails={settings.guestDetails}
          source={source}
          teamName={teamName}
          welcome={undefined}
          quickReplies={[]}
          returning={known}
        />
      </>
    );
  }

  if (screen.name === "start") {
    return (
      <>
        <ScreenHeader onBack={back} onClose={onClose} title="New conversation" />
        <StartForm
          guestDetails={settings.guestDetails}
          source={source}
          teamName={teamName}
          welcome={settings.widget.welcome}
          quickReplies={settings.widget.quickReplies}
          returning={known}
        />
      </>
    );
  }

  return (
    <>
      {screen.name === "messages" ? (
        <MessagesScreen conversations={earlier} teamName={teamName} onClose={onClose} />
      ) : screen.name === "help" ? (
        <HelpScreen onClose={onClose} />
      ) : (
        <HomeScreen
          greeting={settings.widget.greeting}
          intro={settings.widget.intro}
          tickets={settings.tickets.fromChat}
          recent={earlier[0]}
          onClose={onClose}
        />
      )}
      <TabBar
        current={screen.name === "messages" || screen.name === "help" ? screen.name : "home"}
        unread={unread}
      />
    </>
  );
}

/** The chat's box, in the brand's colours, with the settings the preview sends if it is one. */
function Surface({ settings: saved, source, preview = false, className }: ChatProps) {
  const settings = usePreviewSettings(saved, preview);
  const setPreview = useSetPreview();
  useEffect(() => {
    setPreview(preview);
  }, [preview, setPreview]);

  return (
    <BrandProvider brand={settings.brand}>
      {/* White, so the chat reads as its own surface on whatever site it sits in. */}
      <div
        className={cn("bg-card flex h-dvh flex-col", className)}
        style={accentStyle(settings.brand)}
      >
        <Screens settings={settings} source={source} />
      </div>
    </BrandProvider>
  );
}

/**
 * The visitor's side of Helpwren: a home screen, their messages, and the conversations
 * themselves. It fills whatever box it is given, so it works in the widget's frame, on the chat
 * page and in a mobile app's web view.
 */
export function Chat(props: ChatProps) {
  return (
    <HelpwrenProvider getClient={getChatClient}>
      <Surface {...props} />
    </HelpwrenProvider>
  );
}
