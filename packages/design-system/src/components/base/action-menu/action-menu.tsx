"use client";

import { useState, type ComponentProps, type ReactElement } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "#components/ui/dropdown-menu";
import { cn } from "#lib/cn";

import { Button } from "../button/button";
import { Icon } from "../icon/icon";
import { type IconName } from "../icon/registry";
import { Spinner } from "../spinner/spinner";

/** One choice in an action's own menu, such as a collection to move the row to. */
export interface ActionMenuChoice {
  label: string;
  icon?: IconName;
  /** As an item's `onSelect`: a promise keeps the menu open until it settles. */
  onSelect: () => unknown;
  /** As an item's `loading`. */
  loading?: boolean;
}

export interface ActionMenuItem {
  label: string;
  icon?: IconName;
  /**
   * What it does. Return the promise of an action that runs at once, with nothing to confirm,
   * and the menu stays open with a spinner on the item until it settles. Leave it out for an
   * action with `choices`.
   */
  onSelect?: () => unknown;
  /** A menu to pick from instead, such as "Move to" and the places to move to. */
  choices?: readonly ActionMenuChoice[];
  /**
   * The action is running: its icon is a spinner, the other actions wait, and the menu stays
   * open until this is false again. For when the caller keeps the state; returning a promise
   * from `onSelect` does the same with none to keep.
   */
  loading?: boolean;
  /** A destructive action, such as Deactivate or Delete: shown last, in red. */
  destructive?: boolean;
  disabled?: boolean;
}

export interface ActionMenuProps {
  items: readonly ActionMenuItem[];
  /** Who or what the actions are for, so the button reads "More actions for Ada". */
  target: string;
  /** The button that opens the menu, in place of "⋯". It has to name itself. */
  trigger?: ReactElement;
  /** Which way the button's three dots run. Default vertical. */
  dots?: "horizontal" | "vertical";
  /** Where the menu opens from its button. Default below it, lined up with its end. */
  side?: ComponentProps<typeof DropdownMenuContent>["side"];
  align?: ComponentProps<typeof DropdownMenuContent>["align"];
  className?: string;
}

function isPromise(value: unknown): value is PromiseLike<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { then?: unknown }).then === "function"
  );
}

/**
 * Which action is marked `loading` by the caller. Actions are told apart by their place, not
 * their label, which can change under a running action: Publish becomes Unpublish.
 */
function loadingKey(items: readonly ActionMenuItem[]): string | null {
  for (const [index, item] of items.entries()) {
    if (item.loading === true) return String(index);
    const choice = item.choices?.findIndex((one) => one.loading === true) ?? -1;
    if (choice >= 0) return `${index}/${choice}`;
  }
  return null;
}

/**
 * A row's actions in a "⋯" menu, as Featurebase and Intercom keep them, so a list stays one line
 * a row however many actions each has. Destructive actions go last, in red. An action
 * that is running keeps the menu open, with a spinner where its icon was.
 */
export function ActionMenu({
  items,
  target,
  trigger,
  dots = "vertical",
  side = "bottom",
  align = "end",
  className,
}: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  // An action was picked: the menu closes as soon as nothing is running.
  const [picked, setPicked] = useState(false);
  // The action whose promise is still out.
  const [running, setRunning] = useState<string | null>(null);
  const busy = running ?? loadingKey(items);

  // Closed while rendering, not in the handler: by now a caller has had the chance to set
  // `loading`, and not in an effect, which would draw the menu once more first.
  if (picked && busy === null) {
    setPicked(false);
    setOpen(false);
  }

  function select(event: Event, key: string, onSelect: (() => unknown) | undefined) {
    // The menu is closed here, after the action has had the chance to say it is running.
    event.preventDefault();
    if (busy !== null) return;
    const result = onSelect?.();
    setPicked(true);
    if (!isPromise(result)) return;
    setRunning(key);
    const done = () => {
      setRunning(null);
    };
    result.then(done, done);
  }

  const lead = (key: string, icon: IconName | undefined) =>
    busy === key ? (
      <Spinner label="Working" className="size-4" />
    ) : icon ? (
      <Icon name={icon} />
    ) : null;

  const placed = items.map((item, index) => ({ item, id: String(index) }));
  const safe = placed.filter(({ item }) => item.destructive !== true);
  const destructive = placed.filter(({ item }) => item.destructive === true);
  const row = ({ item, id }: { item: ActionMenuItem; id: string }) => {
    const waiting = busy !== null && busy !== id;
    if (item.choices) {
      return (
        <DropdownMenuSub key={item.label}>
          <DropdownMenuSubTrigger disabled={item.disabled === true || waiting}>
            {item.icon ? <Icon name={item.icon} /> : null}
            {item.label}
            <Icon name="caret-right" className="text-muted-foreground ml-auto size-3.5" />
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="border-rule max-h-72 overflow-y-auto border ring-0">
            {item.choices.map((choice, index) => {
              const key = `${id}/${index}`;
              return (
                <DropdownMenuItem
                  key={choice.label}
                  disabled={busy !== null && busy !== key}
                  aria-busy={busy === key || undefined}
                  onSelect={(event) => {
                    select(event, key, choice.onSelect);
                  }}
                >
                  {lead(key, choice.icon)}
                  {choice.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      );
    }
    return (
      <DropdownMenuItem
        key={item.label}
        variant={item.destructive === true ? "destructive" : "default"}
        disabled={item.disabled === true || waiting}
        aria-busy={busy === id || undefined}
        onSelect={(event) => {
          select(event, id, item.onSelect);
        }}
      >
        {lead(id, item.icon)}
        {item.label}
      </DropdownMenuItem>
    );
  };
  return (
    <DropdownMenu
      open={open}
      onOpenChange={(next) => {
        // Nothing closes the menu under an action that is still running.
        if (!next && busy !== null) return;
        setOpen(next);
        if (!next) setPicked(false);
      }}
    >
      <DropdownMenuTrigger asChild>
        {trigger ?? (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`More actions for ${target}`}
            className={cn("shrink-0", className)}
          >
            <Icon name={dots === "vertical" ? "dots-three-vertical" : "dots-three"} />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side={side}
        align={align}
        className="border-rule max-h-72 overflow-y-auto border ring-0"
      >
        {safe.map(row)}
        {destructive.map(row)}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
