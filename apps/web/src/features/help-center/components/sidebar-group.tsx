"use client";

import { Expandable, Icon, type IconName } from "@helpwren/design-system";
import { useId, useState, type ReactNode } from "react";

export interface SidebarGroupProps {
  name: string;
  icon: IconName;
  /** How many articles it holds, shown beside its name. */
  count: number;
  /** Whether it starts open. The reader can open and close it from then on. */
  defaultOpen: boolean;
  /** The links inside it. */
  children: ReactNode;
}

/** One collection in the list of articles: its name, and its articles folding open beneath it. */
export function SidebarGroup({ name, icon, count, defaultOpen, children }: SidebarGroupProps) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        className="hover:bg-muted focus-visible:outline-ring flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left font-semibold transition-colors focus-visible:outline-2"
        onClick={() => {
          setOpen(!open);
        }}
      >
        <Icon name={icon} weight="duotone" className="text-brand size-4 shrink-0" />
        <span className="min-w-0 flex-1 text-pretty">{name}</span>
        <span className="text-muted-foreground text-xs font-normal tabular-nums">{count}</span>
        <Icon
          name="caret-right"
          className={`text-muted-foreground size-3 shrink-0 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
        />
      </button>
      <Expandable id={id} open={open}>
        {children}
      </Expandable>
    </div>
  );
}
