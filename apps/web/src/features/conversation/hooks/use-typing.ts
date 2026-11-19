import { type TypingChannel, type TypingSender, type Typist } from "@helpwren/core";
import { useCallback, useEffect, useRef, useState } from "react";

import { useHelpwren } from "@/lib/helpwren-context";

/** Saying "I am typing" and "I stopped", for the reply box. Does nothing until it is joined. */
export interface TypingControls {
  start: () => void;
  stop: () => void;
}

/**
 * Everyone else typing in a conversation, while it is open, and the controls for saying that
 * the person here is. Several parts of a screen may call this for the same conversation: they
 * share one channel. `sender` is how the person here shows up to the other side.
 */
export function useTyping(conversationId: string, sender?: TypingSender) {
  const getClient = useHelpwren();
  const [typists, setTypists] = useState<Typist[]>([]);
  const channel = useRef<TypingChannel | null>(null);
  const name = sender?.name;
  const avatar = sender?.avatar;

  useEffect(() => {
    const typing = getClient().presence.typing(conversationId, { name, avatar });
    channel.current = typing;
    let stopped = false;
    let leave: (() => Promise<void>) | undefined;

    void typing
      .subscribe(setTypists)
      .then((unsubscribe) => {
        if (stopped) void unsubscribe();
        else leave = unsubscribe;
      })
      // Without live updates the conversation still works; nobody is shown typing.
      .catch(() => undefined);

    return () => {
      stopped = true;
      // Leaving mid-word should not leave the other side watching dots for five seconds.
      typing.stop();
      channel.current = null;
      setTypists([]);
      void leave?.();
    };
  }, [avatar, conversationId, getClient, name]);

  const start = useCallback(() => channel.current?.start(), []);
  const stop = useCallback(() => channel.current?.stop(), []);

  return { typists, start, stop };
}
