"use client";

import {
  ATTACHMENT_TYPES,
  ATTACHMENTS_MAX,
  MESSAGE_MAX_LENGTH,
  type Attachment,
  type PlaceholderValues,
} from "@helpwren/core";
import {
  Button,
  cn,
  Icon,
  Kbd,
  Spinner,
  Textarea,
  Tooltip,
  type TextareaProps,
} from "@helpwren/design-system";
import { useRef, useState } from "react";

import { useSavedReplyPicker } from "@/features/saved-replies";
import { formatBytes } from "@/lib/format-bytes";
import { useHelpwren } from "@/lib/helpwren-context";

import { useAddNote, useSendMessage } from "../hooks/use-thread";
import { type TypingControls } from "../hooks/use-typing";
import { ChatBox, ChatBoxField, ChatBoxSend, chatBoxTool } from "./chat-box";

const NO_PLACEHOLDERS: PlaceholderValues = {};

const failures = {
  rate_limited: "You are writing very fast. Wait a moment and try again.",
  refused: "That message was not sent. Add a few words of your own, or say something new.",
  blocked: "You can no longer send messages here.",
  failed: "That could not be sent. Try again.",
  too_large: "That file is over 10 MB. Choose a smaller one.",
  unsupported: "That kind of file cannot be sent. Try an image, a PDF or a document.",
  forbidden: "You cannot add files to this conversation.",
  too_many: `A message carries ${ATTACHMENTS_MAX} files at most.`,
  upload_failed: "The file could not be uploaded. Try again.",
} as const;

/** A file chosen for the next message: uploading, or uploaded and ready to send. */
interface PendingFile {
  id: string;
  name: string;
  size: number;
  attachment: Attachment | null;
}

type Mode = "reply" | "note";

export interface ComposerProps {
  conversationId: string;
  /**
   * `bar` is the visitor's chat: a soft rounded box with attach and a round send button.
   * `card` is an outlined box with a send button below the text, for the inbox.
   */
  variant?: "bar" | "card";
  /** Lets the writer switch to an internal note, which only the team sees. Team side only. */
  allowNotes?: boolean;
  /** Tells the other side while a reply, never a note, is being written. */
  typing?: TypingControls | undefined;
  /**
   * Turns on saved replies, filled with these values for the open conversation: `/` in the
   * box and a toolbar button. Team side only, in the `card` variant.
   */
  placeholders?: PlaceholderValues | undefined;
  /**
   * Asked before a reply, never a note, is sent; resolving to `false` keeps it in the box. The
   * inbox uses it to check with the writer while a teammate is answering too.
   */
  confirmReply?: (() => Promise<boolean>) | undefined;
}

/** The box for writing a reply. Enter sends; Shift and Enter starts a new line. */
export function Composer({
  conversationId,
  variant = "bar",
  allowNotes = false,
  typing,
  placeholders,
  confirmReply,
}: ComposerProps) {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<Mode>("reply");
  const box = useRef<HTMLTextAreaElement | null>(null);
  const [failure, setFailure] = useState<keyof typeof failures | null>(null);
  const [confirming, setConfirming] = useState(false);
  const send = useSendMessage(conversationId);
  const addNote = useAddNote(conversationId);
  const getClient = useHelpwren();
  const fileInput = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<PendingFile[]>([]);
  const body = text.trim();
  const card = variant === "card";
  const note = mode === "note";
  const pending = send.isPending || addNote.isPending;
  const uploading = files.some((file) => file.attachment === null);
  // A note is words only; files belong to the reply.
  const ready = note ? Boolean(body) : (Boolean(body) || files.length > 0) && !uploading;

  /** Sets the text, and tells the other side whether a reply is being written. */
  function write(next: string) {
    setText(next);
    if (!note && next.trim()) typing?.start();
    else typing?.stop();
  }

  const picker = useSavedReplyPicker({
    enabled: placeholders !== undefined && card,
    values: placeholders ?? NO_PLACEHOLDERS,
    field: box,
    text,
    onTextChange: write,
  });

  /** Uploads each file as it is chosen, so sending the message itself is quick. */
  function addFiles(chosen: readonly File[]) {
    if (chosen.length === 0) return;
    setFailure(null);
    const room = ATTACHMENTS_MAX - files.length;
    if (chosen.length > room) setFailure("too_many");

    for (const file of chosen.slice(0, Math.max(room, 0))) {
      const id = crypto.randomUUID();
      setFiles((current) => [
        ...current,
        { id, name: file.name, size: file.size, attachment: null },
      ]);
      const drop = () => {
        setFiles((current) => current.filter((item) => item.id !== id));
      };
      void getClient()
        .attachments.upload(conversationId, file, file.name)
        .then((result) => {
          if (result.ok) {
            setFiles((current) =>
              current.map((item) =>
                item.id === id ? { ...item, attachment: result.attachment } : item,
              ),
            );
          } else {
            drop();
            setFailure(result.reason);
          }
        })
        .catch(() => {
          drop();
          setFailure("upload_failed");
        });
    }
  }

  async function submit() {
    if (!ready || pending || confirming) return;
    if (!note && confirmReply) {
      setConfirming(true);
      const go = await confirmReply().finally(() => {
        setConfirming(false);
      });
      if (!go) return;
    }
    setFailure(null);
    typing?.stop();
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
    const attachments = files.flatMap((file) => file.attachment ?? []);
    send.mutate(
      { body, attachments },
      {
        onSuccess: (result) => {
          if (result.ok) {
            setText("");
            setFiles([]);
          } else {
            setFailure(result.reason);
          }
        },
        onError: failed,
      },
    );
  }

  const attach = note ? null : (
    <>
      <Tooltip content="Attach files">
        <Button
          type="button"
          variant="ghost"
          size={card ? "icon-sm" : "icon"}
          aria-label="Attach files"
          className={card ? undefined : chatBoxTool}
          disabled={files.length >= ATTACHMENTS_MAX}
          onClick={() => fileInput.current?.click()}
        >
          <Icon name="paperclip" />
        </Button>
      </Tooltip>
      <input
        ref={fileInput}
        type="file"
        multiple
        aria-label="Files to attach"
        accept={ATTACHMENT_TYPES.join(",")}
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          const chosen = [...(event.target.files ?? [])];
          // Cleared, so choosing the same file again still counts as a change.
          event.target.value = "";
          addFiles(chosen);
        }}
      />
    </>
  );

  const chosenFiles =
    note || files.length === 0 ? null : (
      <ul
        aria-label="Files to send"
        className={cn("flex flex-wrap gap-1.5", card ? "px-3 pt-2 max-md:px-2.5" : "px-3 pt-3")}
      >
        {files.map((file) => (
          <li
            key={file.id}
            className="border-rule bg-card flex max-w-full items-center gap-2 rounded-lg border py-1 pr-1 pl-2 text-xs"
          >
            {file.attachment ? (
              <Icon name="paperclip" className="text-muted-foreground size-3.5 shrink-0" />
            ) : (
              <Spinner label={`Uploading ${file.name}`} className="size-3.5 shrink-0" />
            )}
            <span className="max-w-40 truncate font-medium">{file.name}</span>
            <span className="text-muted-foreground shrink-0">{formatBytes(file.size)}</span>
            <button
              type="button"
              aria-label={`Remove ${file.name}`}
              className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-ring grid size-5 shrink-0 place-items-center rounded-md focus-visible:outline-2"
              onClick={() => {
                setFiles((current) => current.filter((item) => item.id !== file.id));
              }}
            >
              <Icon name="x" className="size-3" />
            </button>
          </li>
        ))}
      </ul>
    );

  // What both the inbox's box and the chat's share; each lays out its own field.
  const fieldProps = {
    ref: box,
    "aria-label": note ? "Your note" : "Your message",
    maxLength: MESSAGE_MAX_LENGTH,
    value: text,
    onChange: (event) => {
      write(event.target.value);
      picker.track(event.target);
    },
    onSelect: (event) => {
      picker.track(event.currentTarget);
    },
    onBlur: () => {
      typing?.stop();
      picker.close();
    },
    onKeyDown: (event) => {
      if (picker.onKeyDown(event)) return;
      if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
        event.preventDefault();
        void submit();
      }
    },
    // A screenshot or a copied file pasted into the box is attached, not typed.
    onPaste: (event) => {
      const pasted = [...event.clipboardData.files];
      if (note || pasted.length === 0) return;
      event.preventDefault();
      addFiles(pasted);
    },
  } satisfies TextareaProps;

  const alert = failure ? (
    <p role="alert" className="text-destructive text-xs">
      {failures[failure]}
    </p>
  ) : null;

  if (card) {
    return (
      // On a phone the card sits closer to the edges and holds its parts closer together, so the
      // thread above keeps as much of the small screen as it can.
      <form
        className="grid gap-2 p-3 pt-0 max-md:px-2 max-md:pb-2"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        {alert}
        {/* The whole card is the control: its edge, not the textarea's, shows focus. A note is
            tinted and dashed, so it is never mistaken for a reply to the customer. */}
        <div
          className={cn(
            "relative flex flex-col rounded-xl border shadow-xs transition-colors",
            note
              ? "border-biro bg-status-open-surface/40 border-dashed"
              : "border-rule focus-within:border-ring",
          )}
        >
          {allowNotes ? (
            <div
              role="group"
              aria-label="Write a"
              className="flex gap-1 px-2 pt-2 max-md:px-1.5 max-md:pt-1.5"
            >
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
                    // Writing a note is nothing the customer should see as typing.
                    if (option === "note") typing?.stop();
                  }}
                >
                  {option === "reply" ? "Reply" : "Note"}
                </button>
              ))}
            </div>
          ) : null}
          {picker.list}
          {chosenFiles}
          <Textarea
            {...picker.fieldProps}
            {...fieldProps}
            placeholder={note ? "Write a note only your team will see" : "Write a reply"}
            rows={2}
            className="max-h-40 min-h-14 flex-1 resize-none rounded-none border-0 bg-transparent px-3 pt-2.5 pb-1 text-[0.8125rem] shadow-none focus:border-0 data-keyboard-focus:outline-0 max-md:min-h-12 max-md:px-2.5 max-md:pt-2 md:text-[0.8125rem] dark:bg-transparent"
          />
          <div className="flex items-center justify-between gap-2 px-2 pb-2 max-md:px-1.5 max-md:pb-1.5">
            <div className="flex items-center gap-1">
              {attach}
              {picker.button}
              <p className="text-muted-foreground text-2xs px-1 max-sm:hidden">
                <Kbd className="h-4 px-1 text-[0.625rem]">Enter</Kbd>{" "}
                {note ? "to add the note" : "to send"}
              </p>
            </div>
            <Button
              type="submit"
              size="sm"
              variant={note ? "secondary" : "primary"}
              disabled={!ready}
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
      className="grid gap-2 p-3"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      {alert}
      <ChatBox tools={attach} send={<ChatBoxSend label="Send" ready={ready} loading={pending} />}>
        {chosenFiles}
        <ChatBoxField {...fieldProps} placeholder="Send us a message…" />
      </ChatBox>
    </form>
  );
}
