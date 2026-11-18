import type { ComponentProps, ReactNode } from "react";

import { cn } from "#lib/cn";

export interface MessageBubbleProps extends ComponentProps<"div"> {
  /** `self` is the person reading; `other` is whoever they are talking to. */
  from: "self" | "other";
  /** Who sent it. Shown above messages from the other person, and read out for both. */
  author?: ReactNode;
  /** When it was sent, already formatted. */
  time?: ReactNode;
  /** Marks an internal note that only the team can see. */
  note?: boolean;
  /** Anything under the bubble: a delivery status, attachments, reactions. */
  footer?: ReactNode;
}

/**
 * One message in a conversation. Your own messages are filled and sit on the
 * right; the other person's are outlined and sit on the left, so the two are
 * told apart by shape and position, never by colour alone.
 */
export function MessageBubble({
  from,
  author,
  time,
  note = false,
  footer,
  className,
  children,
  ...props
}: MessageBubbleProps) {
  const self = from === "self";

  return (
    <div
      data-slot="message-bubble"
      data-from={from}
      data-note={note || undefined}
      className={cn(
        "flex max-w-[85%] flex-col gap-1",
        self ? "items-end self-end" : "items-start self-start",
        className,
      )}
      {...props}
    >
      {(author !== undefined && !self) || note ? (
        <p className="text-muted-foreground px-1 text-xs">
          {self ? null : author}
          {note ? <span className="text-biro font-medium"> Internal note</span> : null}
        </p>
      ) : null}
      <div
        className={cn(
          "rounded-2xl px-3.5 py-2 text-sm leading-relaxed break-words whitespace-pre-wrap",
          self
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "border-line border-border bg-card text-card-foreground rounded-bl-md",
          note && "border-line border-biro bg-card text-card-foreground border-dashed",
        )}
      >
        {/* Position and fill are visual only, so say who is speaking. */}
        <span className="sr-only">
          {self
            ? "You: "
            : author === undefined
              ? ""
              : `${typeof author === "string" ? author : "They"}: `}
        </span>
        {children}
      </div>
      {time !== undefined || footer !== undefined ? (
        <div className="text-muted-foreground flex items-center gap-2 px-1 text-xs">
          {time === undefined ? null : <span>{time}</span>}
          {footer === undefined ? null : <span>{footer}</span>}
        </div>
      ) : null}
    </div>
  );
}
