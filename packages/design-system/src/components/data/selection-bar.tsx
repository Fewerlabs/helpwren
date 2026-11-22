"use client";

import { cn } from "#lib/cn";

import { ActionMenu } from "../base/action-menu/action-menu";
import { Button } from "../base/button/button";
import { Icon } from "../base/icon/icon";
import { type IconName } from "../base/icon/registry";
import { type PaginationNoun } from "../base/pagination/pagination";
import { Spinner } from "../base/spinner/spinner";

/** One choice in an action's menu, such as a collection to move the rows to. */
export interface SelectionBarChoice {
  label: string;
  icon?: IconName;
  /** A promise keeps the menu open, with a spinner on the choice, until it settles. */
  onSelect: () => unknown;
}

export interface SelectionBarAction {
  label: string;
  icon?: IconName;
  /** What it does, when it does one thing. Leave it out for an action with `choices`. */
  onSelect?: () => void;
  /** A menu to pick from instead, such as "Move to" and the places to move to. */
  choices?: readonly SelectionBarChoice[];
  /** A destructive action, such as Delete: in red, at the end. */
  destructive?: boolean;
  disabled?: boolean;
}

export interface SelectionBarProps {
  /** How many rows are selected. The bar is not drawn when it is 0. */
  count: number;
  /** What the rows are, for "3 articles selected". Default "selected" alone. */
  noun?: PaginationNoun;
  actions: readonly SelectionBarAction[];
  /** Clears the selection. */
  onClear: () => void;
  /** While an action runs: the actions wait, and a spinner shows. */
  busy?: boolean;
  className?: string;
}

/**
 * What can be done to the rows selected in a table, in a bar that floats over the bottom of it,
 * as Linear and Featurebase do: how many are selected, the actions, and a way to clear them.
 * Destructive actions go last, in red.
 */
export function SelectionBar({
  count,
  noun,
  actions,
  onClear,
  busy = false,
  className,
}: SelectionBarProps) {
  if (count === 0) return null;
  const safe = actions.filter((action) => action.destructive !== true);
  const destructive = actions.filter((action) => action.destructive === true);
  const what = noun ? (count === 1 ? noun.one : noun.other) : null;

  const button = (action: SelectionBarAction) => {
    const content = (
      <>
        {action.icon ? <Icon name={action.icon} /> : null}
        {/* On a phone an action with an icon is the icon alone, so the bar fits. */}
        <span className={cn(action.icon && "max-sm:sr-only")}>{action.label}</span>
        {action.choices ? <Icon name="caret-down" className="text-muted-foreground" /> : null}
      </>
    );
    const shared = {
      variant: "ghost" as const,
      size: "sm" as const,
      disabled: busy || action.disabled === true,
      className: cn(action.destructive === true && "text-destructive hover:text-destructive"),
    };
    if (action.choices) {
      return (
        <ActionMenu
          key={action.label}
          target={action.label}
          side="top"
          align="start"
          items={action.choices}
          trigger={<Button {...shared}>{content}</Button>}
        />
      );
    }
    return (
      <Button key={action.label} {...shared} onClick={action.onSelect}>
        {content}
      </Button>
    );
  };

  return (
    <div
      data-slot="selection-bar"
      role="toolbar"
      aria-label="Selected rows"
      className={cn(
        "bg-card border-rule flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border p-1.5 pl-3 shadow-lg max-sm:gap-0.5",
        className,
      )}
    >
      <span className="flex items-center gap-2 pr-2 text-sm font-medium whitespace-nowrap tabular-nums">
        {busy ? <Spinner label="Working" className="size-3.5" /> : null}
        {count} {what ? <span className="max-sm:hidden">{what} </span> : null}selected
      </span>
      <span className="bg-rule h-5 w-px shrink-0 max-sm:hidden" aria-hidden="true" />
      {safe.map(button)}
      {destructive.length > 0 ? (
        <span className="bg-rule h-5 w-px shrink-0 max-sm:hidden" aria-hidden="true" />
      ) : null}
      {destructive.map(button)}
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Clear selection"
        disabled={busy}
        onClick={onClear}
      >
        <Icon name="x" />
      </Button>
    </div>
  );
}
