"use client";

import { MESSAGE_MAX_LENGTH } from "@helpwren/core";
import { Button, cn, Icon, Kbd, Textarea } from "@helpwren/design-system";
import { useState } from "react";

import { useAddNote, useSendMessage } from "../hooks/use-thread";

const failures = {
  rate_limited: "You are writing very fast. Wait a moment and try again.",
  failed: "That could not be sent. Try again.",
} as const;

type Mode = "reply" | "note";

export interface ComposerProps {
  conversationId: string;
  /**
   * `bar` is a single line with a send button, for the chat on a phone. `card` is a roomier
   * box with the send button below the text, for the inbox.
   */
  variant?: "bar" | "card";
  /** Lets the writer switch to an internal note, which only the team sees. Team side only. */
  allowNotes?: boolean;
}

/** The box for writing a reply. Enter sends; Shift and Enter starts a new line. */
export function Composer({ conversationId, variant = "bar", allowNotes = false }: ComposerProps) {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<Mode>("reply");
  const [failure, setFailure] = useState<keyof typeof failures | null>(null);
  const send = useSendMessage(conversationId);
  const addNote = useAddNote(conversationId);
  const body = text.trim();
  const card = variant === "card";
  const note = mode === "note";
  const pending = send.isPending || addNote.isPending;

  function submit() {
    if (!body || pending) return;
    setFailure(null);
    const failed = () => {
      setFailure("failed");
    };

    if (note) {
      addNote.mutate(body, {
        onSuccess: () => {
          setText("");
        },
        onError: failed,
      });
      return;
    }
    send.mutate(body, {
      onSuccess: (result) => {
        if (result.ok) {
          setText("");
        } else {
          setFailure(result.reason);
        }
      },
      onError: failed,
    });
  }

  const field = (
    <Textarea
      aria-label={note ? "Your note" : "Your message"}
      placeholder={
        note ? "Write a note only your team will see" : card ? "Write a reply" : "Write a message"
      }
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
        {/* The whole card is the control: its edge, not the textarea's, shows focus. A note is
            tinted and dashed, so it is never mistaken for a reply to the customer. */}
        <div
          className={cn(
            "flex flex-col rounded-xl border shadow-xs transition-colors",
            note
              ? "border-biro bg-status-open-surface/40 border-dashed"
              : "border-rule focus-within:border-ring",
          )}
        >
          {allowNotes ? (
            <div role="group" aria-label="Write a" className="flex gap-1 px-2 pt-2">
              {(["reply", "note"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={mode === option}
                  className={cn(
                    "focus-visible:outline-ring h-6 rounded-md px-2 text-xs transition-colors focus-visible:outline-2",
                    mode === option
                      ? "bg-muted text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => {
                    setMode(option);
                    setFailure(null);
                  }}
                >
                  {option === "reply" ? "Reply" : "Note"}
                </button>
              ))}
            </div>
          ) : null}
          {field}
          <div className="flex items-center justify-between gap-2 px-2 pb-2">
            <p className="text-muted-foreground text-2xs px-1 max-sm:hidden">
              <Kbd className="h-4 px-1 text-[0.625rem]">Enter</Kbd>{" "}
              {note ? "to add the note" : "to send"}
            </p>
            <Button
              type="submit"
              size="sm"
              variant={note ? "secondary" : "primary"}
              disabled={!body}
              loading={pending}
            >
              {note ? "Add note" : "Send"}
              <Icon name={note ? "pencil-simple" : "paper-plane-tilt"} />
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
        <Button type="submit" size="icon" aria-label="Send" disabled={!body} loading={pending}>
          <Icon name="paper-plane-tilt" />
        </Button>
      </div>
    </form>
  );
}
