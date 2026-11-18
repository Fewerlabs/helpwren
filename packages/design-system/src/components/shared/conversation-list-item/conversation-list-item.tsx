import type { ComponentProps, ReactNode } from "react";

import { cn } from "#lib/cn";

import type { StatusName } from "../../../tokens/tokens";
import { Avatar } from "../../base/avatar/avatar";
import { Badge } from "../../base/badge/badge";
import { StatusChip } from "../../base/status-chip/status-chip";
import { focusRing } from "../../base/styles";

interface Content {
  /** The contact's name. */
  name: string;
  /** The latest message, shortened to one line. */
  preview: ReactNode;
  /** When the latest message arrived, already formatted. */
  time?: ReactNode;
  status?: StatusName;
  /** How many messages are unread. Zero or undefined shows nothing. */
  unread?: number;
  /** Marks the conversation that is open beside the list. */
  selected?: boolean;
  avatarSrc?: string;
  className?: string;
}

type AsLink = Content & Omit<ComponentProps<"a">, keyof Content | "children"> & { href: string };
type AsButton = Content &
  Omit<ComponentProps<"button">, keyof Content | "children"> & { href?: undefined };

export type ConversationListItemProps = AsLink | AsButton;

/**
 * One row in a list of conversations: who, the latest message, when, and its
 * status. It is a link when given `href` and a button otherwise.
 */
export function ConversationListItem(props: ConversationListItemProps) {
  const { name, preview, time, status, unread = 0, selected = false, avatarSrc, className } = props;
  const hasUnread = unread > 0;
  const classes = cn(
    "hover:bg-muted flex w-full min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
    selected && "bg-muted",
    focusRing,
    className,
  );
  const content = (
    <>
      <Avatar name={name} src={avatarSrc} />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className={cn("truncate text-sm", hasUnread ? "font-semibold" : "font-medium")}>
            {name}
          </span>
          {time === undefined ? null : (
            <span className="text-muted-foreground shrink-0 text-xs">{time}</span>
          )}
        </span>
        <span className="mt-0.5 flex items-center justify-between gap-2">
          <span
            className={cn(
              "truncate text-sm",
              hasUnread ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {preview}
          </span>
          <span className="flex shrink-0 items-center gap-1.5">
            {status === undefined ? null : <StatusChip status={status} size="sm" />}
            {hasUnread ? (
              <Badge variant="accent">
                {unread}
                <span className="sr-only"> unread</span>
              </Badge>
            ) : null}
          </span>
        </span>
      </span>
    </>
  );

  if (props.href !== undefined) {
    const {
      name: _n,
      preview: _p,
      time: _t,
      status: _s,
      unread: _u,
      selected: _sel,
      avatarSrc: _a,
      className: _c,
      ...rest
    } = props;
    return (
      <a
        data-slot="conversation-list-item"
        aria-current={selected ? "true" : undefined}
        className={classes}
        {...rest}
      >
        {content}
      </a>
    );
  }
  const {
    name: _n,
    preview: _p,
    time: _t,
    status: _s,
    unread: _u,
    selected: _sel,
    avatarSrc: _a,
    className: _c,
    href: _h,
    ...rest
  } = props;
  return (
    <button
      type="button"
      data-slot="conversation-list-item"
      aria-current={selected ? "true" : undefined}
      className={classes}
      {...rest}
    >
      {content}
    </button>
  );
}
