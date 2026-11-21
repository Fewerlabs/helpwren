"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#components/ui/dropdown-menu";
import { cn } from "#lib/cn";

import { Button } from "../button/button";
import { Icon } from "../icon/icon";
import { type IconName } from "../icon/registry";

export interface ActionMenuItem {
  label: string;
  icon?: IconName;
  onSelect: () => void;
  /** A destructive action, such as Deactivate or Delete: shown last, in red, after a line. */
  destructive?: boolean;
  disabled?: boolean;
}

export interface ActionMenuProps {
  items: readonly ActionMenuItem[];
  /** Who or what the actions are for, so the button reads "More actions for Ada". */
  target: string;
  className?: string;
}

/**
 * A row's actions in a "⋯" menu, as Featurebase and Intercom keep them, so a list stays one line
 * a row however many actions each has. Destructive actions go last, after a line.
 */
export function ActionMenu({ items, target, className }: ActionMenuProps) {
  const safe = items.filter((item) => item.destructive !== true);
  const destructive = items.filter((item) => item.destructive === true);
  const row = (item: ActionMenuItem) => (
    <DropdownMenuItem
      key={item.label}
      variant={item.destructive === true ? "destructive" : "default"}
      disabled={item.disabled}
      onSelect={item.onSelect}
    >
      {item.icon ? <Icon name={item.icon} /> : null}
      {item.label}
    </DropdownMenuItem>
  );
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`More actions for ${target}`}
          className={cn("shrink-0", className)}
        >
          <Icon name="dots-three" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="border-rule border ring-0">
        {safe.map(row)}
        {safe.length > 0 && destructive.length > 0 ? <DropdownMenuSeparator /> : null}
        {destructive.map(row)}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
