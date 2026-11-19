"use client";

import { type SavedReply } from "@helpwren/core";
import { cn, Spinner } from "@helpwren/design-system";
import { useEffect, useRef } from "react";

/** The id of one reply's option, for `aria-activedescendant`. */
export const optionId = (listId: string, reply: SavedReply) => `${listId}-${reply.id}`;

export interface SavedReplyOptionsProps {
  id: string;
  replies: readonly SavedReply[];
  /** The option the arrow keys are on. */
  active: number;
  loading?: boolean;
  /** Said when nothing matches. */
  empty: string;
  onPick: (reply: SavedReply) => void;
  onHover: (index: number) => void;
  /** How each reply reads once used, with its placeholders filled. */
  preview: (body: string) => string;
  className?: string;
}

/**
 * Saved replies to choose from, as a listbox. Focus stays in the field that drives it, which
 * points at the active option with `aria-activedescendant`, so typing never stops.
 */
export function SavedReplyOptions({
  id,
  replies,
  active,
  loading = false,
  empty,
  onPick,
  onHover,
  preview,
  className,
}: SavedReplyOptionsProps) {
  const list = useRef<HTMLDivElement>(null);
  const activeReply = replies[active];

  useEffect(() => {
    if (!activeReply) return;
    // `getElementById` would find the option anywhere; this keeps to this list.
    list.current
      ?.querySelector(`[id="${optionId(id, activeReply)}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeReply, id]);

  if (loading) {
    return (
      <div className={cn("flex justify-center p-4", className)}>
        <Spinner label="Loading saved replies" className="size-4" />
      </div>
    );
  }

  if (replies.length === 0) {
    return (
      <p id={id} role="status" className={cn("text-muted-foreground px-4 py-3 text-xs", className)}>
        {empty}
      </p>
    );
  }

  return (
    <div
      ref={list}
      id={id}
      role="listbox"
      aria-label="Saved replies"
      className={cn("max-h-64 overflow-y-auto p-1", className)}
    >
      {replies.map((reply, index) => (
        <div
          key={reply.id}
          id={optionId(id, reply)}
          role="option"
          aria-selected={index === active}
          // Out of the tab order: the field keeps focus and points here instead.
          tabIndex={-1}
          className={cn(
            "grid cursor-pointer gap-0.5 rounded-lg px-3 py-2",
            index === active && "bg-muted",
          )}
          // Chosen on press, before the field loses focus, so the caret stays where it was.
          onMouseDown={(event) => {
            event.preventDefault();
            onPick(reply);
          }}
          onMouseMove={() => {
            if (index !== active) onHover(index);
          }}
        >
          <span className="flex min-w-0 items-baseline gap-2">
            <span className="truncate text-xs font-medium">{reply.title}</span>
            {reply.shortcut ? (
              <span className="text-muted-foreground shrink-0 font-mono text-[0.6875rem]">
                /{reply.shortcut}
              </span>
            ) : null}
            {reply.visibility === "personal" ? (
              <span className="text-muted-foreground text-2xs ml-auto shrink-0">Only you</span>
            ) : null}
          </span>
          <span className="text-muted-foreground truncate text-[0.6875rem]">
            {preview(reply.body)}
          </span>
        </div>
      ))}
    </div>
  );
}
