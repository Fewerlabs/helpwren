"use client";

import {
  Button,
  cn,
  Icon,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Textarea,
  type TextareaProps,
} from "@helpwren/design-system";
import { useRef, useState, type ReactNode, type RefObject } from "react";

/** A short list of the emoji people reach for most in a support chat. */
const EMOJI = [
  ["😀", "Grinning face"],
  ["😊", "Smiling face"],
  ["😂", "Tears of joy"],
  ["🙂", "Slight smile"],
  ["😉", "Winking face"],
  ["😍", "Heart eyes"],
  ["🤔", "Thinking face"],
  ["😅", "Sweat smile"],
  ["😢", "Crying face"],
  ["😮", "Surprised face"],
  ["😬", "Grimacing face"],
  ["🙏", "Folded hands"],
  ["👍", "Thumbs up"],
  ["👎", "Thumbs down"],
  ["👏", "Clapping hands"],
  ["🙌", "Raised hands"],
  ["👋", "Waving hand"],
  ["💪", "Flexed arm"],
  ["❤️", "Red heart"],
  ["🎉", "Party popper"],
  ["🔥", "Fire"],
  ["✨", "Sparkles"],
  ["✅", "Check mark"],
  ["👀", "Eyes"],
] as const;

/**
 * The visitor's message box: a soft rounded well set into the white chat panel, with the text on
 * top and a row of tools and the round send button below it. The well, not the text field, shows
 * focus. Put the text field, and anything shown above it such as chosen files, inside.
 */
export function ChatBox({
  children,
  tools,
  send,
}: {
  children: ReactNode;
  /** Small ghost buttons on the left of the bottom row, such as attach and emoji. */
  tools: ReactNode;
  /** The send button, on the right of the bottom row. */
  send: ReactNode;
}) {
  return (
    <div
      className={cn(
        "bg-well border-line flex flex-col rounded-[calc(var(--radius)+0.875rem)] border-transparent transition-colors",
        "focus-within:border-ring",
        // The ring for keyboard focus is the well's, so the field inside shows none of its own.
        "has-[textarea[data-keyboard-focus]]:outline-ring has-[textarea[data-keyboard-focus]]:outline-2 has-[textarea[data-keyboard-focus]]:outline-offset-2 has-[textarea[data-keyboard-focus]]:outline-solid",
      )}
    >
      {children}
      <div className="flex items-center justify-between gap-2 px-2 pb-2">
        <div className="text-muted-foreground flex items-center gap-0.5">{tools}</div>
        {send}
      </div>
    </div>
  );
}

/**
 * The text field inside a `ChatBox`: borderless, 16px so a phone does not zoom in, and growing
 * with what is written up to a few lines before it scrolls.
 */
export function ChatBoxField({ className, ...props }: TextareaProps) {
  return (
    <Textarea
      rows={1}
      className={cn(
        "max-h-40 min-h-12 resize-none rounded-none border-0 bg-transparent px-4 pt-3.5 pb-1 text-base shadow-none focus:border-0 disabled:bg-transparent data-keyboard-focus:outline-0 md:text-base dark:bg-transparent dark:disabled:bg-transparent",
        className,
      )}
      {...props}
    />
  );
}

/** A muted ghost button for the bottom row of a `ChatBox`. */
export const chatBoxTool = "text-muted-foreground hover:text-foreground rounded-full";

/**
 * The round send button of a `ChatBox`. Light and quiet while there is nothing to send; filled
 * with the brand's button colour once there is.
 */
export function ChatBoxSend({
  label,
  ready,
  loading,
}: {
  label: string;
  ready: boolean;
  loading: boolean;
}) {
  return (
    <Button
      type="submit"
      size="icon"
      aria-label={label}
      disabled={!ready}
      loading={loading}
      className={cn(
        "rounded-full",
        !ready && "bg-card text-muted-foreground dark:bg-card disabled:opacity-100",
      )}
    >
      <Icon name="arrow-up" weight="bold" />
    </Button>
  );
}

/**
 * Opens a small grid of emoji. A pick goes in where the caret was in `field`, and the caret is
 * put back just after it.
 */
export function EmojiPicker({
  field,
  onInsert,
  disabled = false,
}: {
  field: RefObject<HTMLTextAreaElement | null>;
  /** Called with the field's whole new text. */
  onInsert: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  // Where the caret goes once the panel has closed, when an emoji was picked.
  const caret = useRef<number | null>(null);

  function pick(emoji: string) {
    const box = field.current;
    if (!box) return;
    const { value, selectionStart, selectionEnd } = box;
    const next = value.slice(0, selectionStart) + emoji + value.slice(selectionEnd);
    setOpen(false);
    if (box.maxLength > 0 && next.length > box.maxLength) return;
    caret.current = selectionStart + emoji.length;
    onInsert(next);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Add an emoji"
          disabled={disabled}
          className={chatBoxTool}
        >
          <Icon name="smiley" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        aria-label="Emoji"
        className="w-auto p-1.5"
        onCloseAutoFocus={(event) => {
          const box = field.current;
          const at = caret.current;
          caret.current = null;
          if (!box || at === null) return;
          // Back to writing, rather than to the button that opened the panel.
          event.preventDefault();
          box.focus();
          box.setSelectionRange(at, at);
        }}
      >
        <ul className="grid grid-cols-6">
          {EMOJI.map(([emoji, name]) => (
            <li key={emoji}>
              <button
                type="button"
                aria-label={name}
                title={name}
                className="hover:bg-muted focus-visible:outline-ring grid size-10 place-items-center rounded-lg text-xl focus-visible:outline-2"
                onClick={() => {
                  pick(emoji);
                }}
              >
                {emoji}
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
