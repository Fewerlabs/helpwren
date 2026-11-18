"use client";

import { Button, Icon } from "@helpwren/design-system";
import { type ReactNode } from "react";

export interface ScreenHeaderProps {
  title: ReactNode;
  /** Shows a back arrow that calls this. Leave it out on a tab's own screen. */
  onBack?: () => void;
  /** What the back arrow returns to, for its accessible name. */
  backLabel?: string;
}

/** The bar at the top of every screen but Home: a centred title, and a way back on sub-screens. */
export function ScreenHeader({ title, onBack, backLabel = "Back" }: ScreenHeaderProps) {
  return (
    <header className="grid h-14 shrink-0 grid-cols-[2.5rem_1fr_2.5rem] items-center px-2">
      {onBack ? (
        <Button variant="ghost" size="icon-sm" aria-label={backLabel} onClick={onBack}>
          <Icon name="caret-left" />
        </Button>
      ) : (
        <span />
      )}
      <h1 className="flex min-w-0 items-center justify-center gap-2 text-sm font-semibold">
        {title}
      </h1>
    </header>
  );
}
