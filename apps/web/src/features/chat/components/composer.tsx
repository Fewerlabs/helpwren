"use client";

import { MESSAGE_MAX_LENGTH } from "@helpwren/core";
import { Button, Icon, Textarea } from "@helpwren/design-system";
import { useState } from "react";

import { useSendMessage } from "../hooks/use-chat";

const failures = {
  rate_limited: "You are writing very fast. Wait a moment and try again.",
  failed: "Your message could not be sent. Try again.",
} as const;

/** The box for writing a reply. Enter sends; Shift and Enter starts a new line. */
export function Composer({ conversationId }: { conversationId: string }) {
  const [text, setText] = useState("");
  const [failure, setFailure] = useState<keyof typeof failures | null>(null);
  const send = useSendMessage(conversationId);
  const body = text.trim();

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

  return (
    <form
      className="border-rule grid gap-2 border-t p-3"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      {failure ? (
        <p role="alert" className="text-destructive text-xs">
          {failures[failure]}
        </p>
      ) : null}
      <div className="flex items-end gap-2">
        <Textarea
          aria-label="Your message"
          placeholder="Write a message"
          rows={1}
          maxLength={MESSAGE_MAX_LENGTH}
          className="max-h-32 min-h-10 flex-1 resize-none"
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
