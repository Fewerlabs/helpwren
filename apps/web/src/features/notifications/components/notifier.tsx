"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { useHelpwren } from "@/lib/helpwren-context";

import { playSound, showDesktopAlert } from "../alert";
import { usePreferences } from "../preferences";
import { shouldNotify } from "../should-notify";

export interface NotifierProps {
  /** The signed-in team member. */
  agentId: string;
}

/**
 * Tells a team member about new messages while the dashboard is open, the way they chose in
 * their notification settings. It draws nothing.
 */
export function Notifier({ agentId }: NotifierProps) {
  const getClient = useHelpwren();
  const router = useRouter();
  const preferences = usePreferences();
  // Read when a message arrives, so changing a preference does not restart the subscription.
  const current = useRef(preferences);
  useEffect(() => {
    current.current = preferences;
  }, [preferences]);

  const listening = preferences.desktop || preferences.sound;

  useEffect(() => {
    if (!listening) return undefined;
    const since = new Date().toISOString();
    const lastSeen = new Map<string, string>();
    let stopped = false;
    let stop: (() => Promise<void>) | undefined;

    void getClient()
      .conversations.subscribe({ inbox: true }, (conversation) => {
        const { desktop, sound, about } = current.current;
        const news = shouldNotify({
          conversation,
          lastSeenAt: lastSeen.get(conversation.id),
          since,
          agentId,
          about,
        });
        if (conversation.lastMessageAt) lastSeen.set(conversation.id, conversation.lastMessageAt);
        if (!news) return;

        if (sound) playSound();
        // With the dashboard in view, the inbox itself shows the message.
        if (desktop && document.hidden) {
          showDesktopAlert({
            title: "New message",
            body: conversation.lastMessagePreview ?? "Open the inbox to read it.",
            tag: conversation.id,
            onOpen: () => {
              router.push(`/dashboard/inbox?view=all&c=${conversation.id}`);
            },
          });
        }
      })
      .then((unsubscribe) => {
        if (stopped) {
          void unsubscribe();
        } else {
          stop = unsubscribe;
        }
      })
      // Without live updates there is nothing to tell; the inbox still loads what is new.
      .catch(() => undefined);

    return () => {
      stopped = true;
      void stop?.();
    };
  }, [agentId, getClient, listening, router]);

  return null;
}
