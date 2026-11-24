"use client";

import { hasRequiredGuestDetails, type Message, type PublicSettings } from "@helpwren/core";
import { cn, Skeleton } from "@helpwren/design-system";
import { PREVIEW_MAX_LENGTH } from "helpwren/protocol";
import { useCallback, useEffect, useMemo } from "react";

import { Thread } from "@/features/conversation";
import { brandProps } from "@/lib/accent";
import { BrandOnBody } from "@/lib/brand-on-body";
import { HelpwrenProvider } from "@/lib/helpwren-context";

import { AudienceProvider } from "../audience";
import { BrandProvider, TeamAvatar } from "../brand";
import { getChatClient } from "../client";
import {
  useConversations,
  useLiveConversations,
  useOwnDetails,
  useRefreshConversations,
  useSession,
  useSessionEnd,
} from "../hooks/use-chat";
import { useEmbedBridge } from "../hooks/use-embed-bridge";
import { usePreviewSettings } from "../hooks/use-preview-settings";
import { useVisitorTracking } from "../hooks/use-visitor-tracking";
import {
  useHelpFocus,
  usePreview,
  useScreen,
  useSetPreview,
  useShowScreen,
  useTab,
} from "../store/chat-store";
import {
  ArticleScreen,
  CollectionScreen,
  HelpLanding,
  HelpScreen,
  useHelpLanding,
} from "./help-screen";
import { HomeScreen } from "./home-screen";
import { MessagesScreen } from "./messages-screen";
import { RatingPrompt } from "./rating-prompt";
import { ScreenHeader } from "./screen-header";
import { StartForm } from "./start-form";
import { TabBar, type TabName } from "./tab-bar";
import { TeamStatus } from "./team-status";
import { TicketBar } from "./ticket-bar";

export interface ChatProps {
  settings: PublicSettings;
  /** Where the chat is embedded, such as `web`. Shown to the team as the channel. */
  source: string;
  /** Whose help articles to list, besides those for everyone. Left out: every article. */
  audience?: string | undefined;
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
  const details = useOwnDetails();
  const conversations = useConversations();
  const refresh = useRefreshConversations();
  useSessionEnd();
  useLiveConversations(session.data?.id);

  const contactId = session.data?.id;
  const isOwn = useCallback((message: Message) => message.senderId === contactId, [contactId]);

  const teamName = settings.brand.name;
  const captchaSiteKey = settings.spam.captcha === "turnstile" ? settings.spam.siteKey : undefined;
  const earlier = conversations.data ?? [];
  const unread = earlier.reduce((total, item) => total + item.unreadForContact, 0);
  // The list is newest first, so the first with something unread holds the newest reply.
  const newest = earlier.find((item) => item.unreadForContact > 0 && item.lastMessagePreview);
  const newestId = newest?.id;
  const newestPreview = newest?.lastMessagePreview?.slice(0, PREVIEW_MAX_LENGTH);
  const unreadState = useMemo(
    () => ({
      count: unread,
      latest:
        newestId && newestPreview
          ? { conversationId: newestId, preview: newestPreview }
          : undefined,
    }),
    [unread, newestId, newestPreview],
  );
  const bridge = useEmbedBridge(unreadState);
  useVisitorTracking(settings, source);
  const onClose = bridge.embedded && bridge.closable ? bridge.close : undefined;
  // Someone who has said who they are before, or whom the host product vouches for, is not
  // asked again. What they said is the server's test too; the conversations stand in for it
  // when it cannot be read.
  const known =
    session.data?.isGuest === false ||
    (details.data
      ? details.data.verified || hasRequiredGuestDetails(settings.guestDetails, details.data)
      : earlier.length > 0);
  // The tabs the install shows. A screen whose tab is off falls back to the first one left.
  // Home also steps aside while the page has opened the chat on its own help, until it closes.
  const landingHelp = useHelpLanding();
  const focused = useHelpFocus() !== null;
  const homeTab = settings.widget.tabs.home && !focused;
  const helpTab = settings.widget.tabs.help || focused;
  const shownTabs: TabName[] = [
    ...(homeTab ? (["home"] as const) : []),
    "messages",
    ...(helpTab ? (["help"] as const) : []),
  ];
  const landing: TabName = focused ? "help" : homeTab ? "home" : "messages";
  const shownTab = (name: TabName): TabName => (shownTabs.includes(name) ? name : landing);
  const back = () => {
    show({ name: shownTab(tab) });
  };

  if (
    !preview &&
    (session.isPending || (Boolean(session.data) && (conversations.isPending || details.isPending)))
  ) {
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
              <TeamAvatar size="sm" className="text-2xs size-6 shrink-0" />
              <span className="grid min-w-0 leading-tight">
                <span className="truncate">{teamName}</span>
                <TeamStatus className="text-2xs font-normal" />
              </span>
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

  if (screen.name === "help" && landingHelp) return <HelpLanding onClose={onClose} />;

  if (screen.name === "collection") {
    return <CollectionScreen collection={screen.collection} onBack={back} onClose={onClose} />;
  }

  if (screen.name === "article") {
    const { from } = screen;
    return (
      <ArticleScreen
        slug={screen.slug}
        // Back to the collection it was opened in, when there was one.
        onBack={
          from
            ? () => {
                show({ name: "collection", collection: from });
              }
            : back
        }
        onClose={onClose}
        onResize={bridge.embedded ? bridge.resize : undefined}
      />
    );
  }

  if (screen.name === "ticket" && settings.tickets.fromChat) {
    return (
      <>
        <ScreenHeader onBack={back} onClose={onClose} title="New ticket" />
        <StartForm
          ticket
          guestDetails={settings.guestDetails}
          captchaSiteKey={captchaSiteKey}
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
          captchaSiteKey={captchaSiteKey}
          source={source}
          teamName={teamName}
          welcome={settings.widget.welcome}
          quickReplies={settings.widget.quickReplies}
          returning={known}
        />
      </>
    );
  }

  const current = shownTab(
    screen.name === "messages" || screen.name === "help" ? screen.name : "home",
  );
  return (
    <>
      {current === "messages" ? (
        <MessagesScreen conversations={earlier} teamName={teamName} onClose={onClose} />
      ) : current === "help" ? (
        <HelpScreen onClose={onClose} />
      ) : (
        <HomeScreen
          greeting={settings.widget.greeting}
          intro={settings.widget.intro}
          tickets={settings.tickets.fromChat}
          recent={earlier[0]}
          helpTab={helpTab}
          onClose={onClose}
        />
      )}
      <TabBar
        current={current}
        shown={shownTabs}
        unread={unread}
        poweredBy={settings.brand.poweredBy !== false}
      />
    </>
  );
}

/** The chat's box, in the brand's colours, with the settings the preview sends if it is one. */
function Surface({
  settings: saved,
  source,
  preview = false,
  className,
}: Omit<ChatProps, "audience">) {
  const settings = usePreviewSettings(saved, preview);
  const setPreview = useSetPreview();
  useEffect(() => {
    setPreview(preview);
  }, [preview, setPreview]);

  return (
    <BrandProvider brand={settings.brand}>
      {/* White, so the chat reads as its own surface on whatever site it sits in. */}
      <div className={cn("bg-card flex h-dvh flex-col", className)} {...brandProps(settings.brand)}>
        <BrandOnBody brand={settings.brand} />
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
export function Chat({ audience, ...props }: ChatProps) {
  return (
    <HelpwrenProvider getClient={getChatClient}>
      <AudienceProvider audience={audience}>
        <Surface {...props} />
      </AudienceProvider>
    </HelpwrenProvider>
  );
}
