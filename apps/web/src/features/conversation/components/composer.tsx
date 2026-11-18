"use client";

import { MESSAGE_MAX_LENGTH } from "@helpwren/core";
import { Button, cn, Icon, Kbd, Textarea } from "@helpwren/design-system";
import { useState } from "react";

import { useSendMessage } from "../hooks/use-thread";

const failures = {
  rate_limited: "You are writing very fast. Wait a moment and try again.",
  failed: "Your message could not be sent. Try again.",
} as const;

export interface ComposerProps {
  conversationId: string;
  /**
   * `bar` is a single line with a send button, for the chat on a phone. `card` is a roomier
   * box with the send button below the text, for the inbox.
   */
  variant?: "bar" | "card";
}

/** The box for writing a reply. Enter sends; Shift and Enter starts a new line. */
export function Composer({ conversationId, variant = "bar" }: ComposerProps) {
  const [text, setText] = useState("");
  const [failure, setFailure] = useState<keyof typeof failures | null>(null);
  const send = useSendMessage(conversationId);
  const body = text.trim();
  const card = variant === "card";

  function submit() {
    if (!body || send.isPending) return;
    setFailure(null);
    send.mutate(body, {
      onSuccess: (result) => {
        if (result.ok) {
          setText("");
        } else {
          setFailure(result.reason);
        }
      },
      onError: () => {
        setFailure("failed");
      },
    });
  }

  const field = (
    <Textarea
      aria-label="Your message"
      placeholder={card ? "Write a reply" : "Write a message"}
      rows={card ? 2 : 1}
      maxLength={MESSAGE_MAX_LENGTH}
      className={cn(
        "max-h-40 flex-1 resize-none",
        card
          ? "min-h-14 rounded-none border-0 bg-transparent px-3 pt-2.5 pb-1 text-[0.8125rem] shadow-none focus:border-0 data-keyboard-focus:outline-0 md:text-[0.8125rem] dark:bg-transparent"
          : "min-h-10",
      )}
      value={text}
      onChange={(event) => {
        setText(event.target.value);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
          event.preventDefault();
          submit();
        }
      }}
    />
  );

  const alert = failure ? (
    <p role="alert" className="text-destructive text-xs">
      {failures[failure]}
    </p>
  ) : null;

  if (card) {
    return (
      <form
        className="grid gap-2 p-3 pt-0"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        {alert}
        {/* The whole card is the control: its edge, not the textarea's, shows focus. */}
        <div className="border-rule focus-within:border-ring flex flex-col rounded-xl border shadow-xs transition-colors">
          {field}
          <div className="flex items-center justify-between gap-2 px-2 pb-2">
            <p className="text-muted-foreground text-2xs px-1 max-sm:hidden">
              <Kbd className="h-4 px-1 text-[0.625rem]">Enter</Kbd> to send
            </p>
            <Button type="submit" size="sm" disabled={!body} loading={send.isPending}>
              Send
              <Icon name="paper-plane-tilt" />
            </Button>
          </div>
        </div>
      </form>
    );
  }

  return (
    <form
      className="border-rule grid gap-2 border-t p-3"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      {alert}
      <div className="flex items-end gap-2">
        {field}
        <Button
          type="submit"
          size="icon"
          aria-label="Send"
          disabled={!body}
          loading={send.isPending}
        >
          <Icon name="paper-plane-tilt" />
        </Button>
      </div>
    </form>
  );
}
