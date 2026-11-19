"use client";

import { type PlaceholderValues, type SavedReply } from "@helpwren/core";
import {
  Button,
  Icon,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tooltip,
} from "@helpwren/design-system";
import Link from "next/link";
import { useId, useState, type KeyboardEvent, type ReactNode, type RefObject } from "react";

import { useFillPlaceholders, useSavedReplies } from "../hooks/use-saved-replies";
import {
  filterSavedReplies,
  findSlashQuery,
  pickerKey,
  replaceRange,
  type SlashQuery,
} from "../picker";
import { SavedReplyDialog } from "./saved-reply-dialog";
import { optionId, SavedReplyOptions } from "./saved-reply-options";

export interface SavedReplyPickerOptions {
  /** Off in the visitor's chat, where there are no saved replies. */
  enabled: boolean;
  /** What the open conversation fills placeholders with. */
  values: PlaceholderValues;
  /** The reply box. */
  field: RefObject<HTMLTextAreaElement | null>;
  text: string;
  /** Sets the reply box's text, as typing would. */
  onTextChange: (text: string) => void;
}

export interface SavedReplyPicker {
  /** Call on every change and caret move in the reply box. */
  track: (field: HTMLTextAreaElement) => void;
  /** Call first in the reply box's `onKeyDown`. True when the key was the picker's. */
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => boolean;
  /** Closes the list, as when the reply box loses focus. */
  close: () => void;
  /** For the reply box, so assistive technology follows the list it drives. */
  fieldProps: {
    "aria-autocomplete"?: "list";
    "aria-controls"?: string;
    "aria-activedescendant"?: string;
  };
  /** The list that opens above the reply box after a `/`. Place it in a positioned box. */
  list: ReactNode;
  /** The toolbar button that opens the same replies with a search field. */
  button: ReactNode;
}

/**
 * Saved replies in the reply box: `/` at the start of a line or after a space opens a list
 * that narrows as the person types, the arrows move through it, Enter puts the reply in place
 * of the `/query` with its placeholders filled, and Escape closes it. The toolbar button does
 * the same from a search field, and turns what is typed into a new saved reply.
 */
export function useSavedReplyPicker({
  enabled,
  values,
  field,
  text,
  onTextChange,
}: SavedReplyPickerOptions): SavedReplyPicker {
  const listId = useId();
  const [slash, setSlash] = useState<SlashQuery | null>(null);
  // The `/` the person closed the list on, so moving the caret does not open it again.
  const [dismissed, setDismissed] = useState<number | null>(null);
  const [active, setActive] = useState(0);
  // Nothing is loaded until someone first reaches for a saved reply.
  const [wanted, setWanted] = useState(false);
  const replies = useSavedReplies(enabled && wanted);
  const fill = useFillPlaceholders(values, enabled && wanted);

  const open = enabled && slash !== null && slash.start !== dismissed;
  const matches = open ? filterSavedReplies(replies.data ?? [], slash.query) : [];
  const activeReply = matches[active];

  function insert(reply: SavedReply, range: { start: number; end: number }) {
    const next = replaceRange(text, range, fill(reply.body));
    onTextChange(next.text);
    setSlash(null);
    requestAnimationFrame(() => {
      field.current?.focus();
      field.current?.setSelectionRange(next.caret, next.caret);
    });
  }

  function track(element: HTMLTextAreaElement) {
    if (!enabled) return;
    const found = findSlashQuery(element.value, element.selectionStart);
    if (found) setWanted(true);
    else setDismissed(null);
    if (found?.query !== slash?.query) setActive(0);
    setSlash(found);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (!open || event.nativeEvent.isComposing) return false;
    const action = pickerKey(event.key, active, matches.length);
    if (!action) {
      // Enter with nothing to choose closes the list, rather than sending "/refnd" to someone.
      if (event.key !== "Enter" || event.shiftKey) return false;
      event.preventDefault();
      setDismissed(slash.start);
      return true;
    }
    event.preventDefault();
    if (action.type === "move") setActive(action.index);
    else if (action.type === "close") setDismissed(slash.start);
    else if (activeReply) insert(activeReply, slash);
    return true;
  }

  return {
    track,
    close: () => {
      setSlash(null);
    },
    onKeyDown,
    fieldProps: enabled
      ? {
          "aria-autocomplete": "list",
          ...(open ? { "aria-controls": listId } : {}),
          ...(activeReply ? { "aria-activedescendant": optionId(listId, activeReply) } : {}),
        }
      : {},
    list: open ? (
      <div className="border-rule bg-popover text-popover-foreground absolute inset-x-0 bottom-full z-20 mb-2 rounded-xl border shadow-md">
        <SavedReplyOptions
          id={listId}
          replies={matches}
          active={active}
          loading={replies.isPending}
          empty={slash.query ? `No saved replies match “${slash.query}”.` : "No saved replies yet."}
          onPick={(reply) => {
            insert(reply, slash);
          }}
          onHover={setActive}
          preview={fill}
        />
      </div>
    ) : null,
    button: enabled ? (
      <SavedRepliesButton
        text={text}
        preview={fill}
        onPick={(reply) => {
          const element = field.current;
          insert(reply, {
            start: element?.selectionStart ?? text.length,
            end: element?.selectionEnd ?? text.length,
          });
        }}
        onOpen={() => {
          setWanted(true);
        }}
      />
    ) : null,
  };
}

interface SavedRepliesButtonProps {
  /** What is typed now, for "Save as reply". */
  text: string;
  onPick: (reply: SavedReply) => void;
  onOpen: () => void;
  preview: (body: string) => string;
}

/** The toolbar's way to the saved replies: search, choose, or save what is typed as one. */
function SavedRepliesButton({ text, onPick, onOpen, preview }: SavedRepliesButtonProps) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [active, setActive] = useState(0);
  const [saving, setSaving] = useState(false);
  const replies = useSavedReplies(open);
  const matches = filterSavedReplies(replies.data ?? [], search);
  const activeReply = matches[active];

  function pick(reply: SavedReply) {
    setOpen(false);
    onPick(reply);
  }

  return (
    <>
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next) {
            onOpen();
            setSearch("");
            setActive(0);
          }
        }}
      >
        <Tooltip content="Saved replies">
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Saved replies">
              <Icon name="lightning" />
            </Button>
          </PopoverTrigger>
        </Tooltip>
        <PopoverContent
          align="start"
          side="top"
          className="w-[min(22rem,calc(100vw-2rem))] p-0"
          // The search field takes focus, so typing filters at once.
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            (event.currentTarget as HTMLElement | null)?.querySelector("input")?.focus();
          }}
        >
          <div className="border-rule border-b p-2">
            <Input
              role="combobox"
              aria-label="Search saved replies"
              aria-expanded="true"
              aria-controls={listId}
              aria-autocomplete="list"
              {...(activeReply ? { "aria-activedescendant": optionId(listId, activeReply) } : {})}
              placeholder="Search saved replies"
              autoComplete="off"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setActive(0);
              }}
              onKeyDown={(event) => {
                const action = pickerKey(event.key, active, matches.length);
                if (!action || action.type === "close") return;
                event.preventDefault();
                if (action.type === "move") setActive(action.index);
                else if (activeReply) pick(activeReply);
              }}
            />
          </div>
          <SavedReplyOptions
            id={listId}
            replies={matches}
            active={active}
            loading={replies.isPending}
            empty={search ? "No saved replies match." : "No saved replies yet."}
            onPick={pick}
            onHover={setActive}
            preview={preview}
          />
          <div className="border-rule flex items-center justify-between gap-2 border-t p-1.5">
            <Button
              variant="ghost"
              size="sm"
              disabled={!text.trim()}
              onClick={() => {
                setOpen(false);
                setSaving(true);
              }}
            >
              <Icon name="plus" />
              Save as reply
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/settings/saved-replies">Manage</Link>
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      {saving ? (
        <SavedReplyDialog
          reply={null}
          initialBody={text.trim()}
          onClose={() => {
            setSaving(false);
          }}
        />
      ) : null}
    </>
  );
}
