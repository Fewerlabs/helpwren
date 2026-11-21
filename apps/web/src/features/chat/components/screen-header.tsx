"use client";

import { Button, cn, Icon } from "@helpwren/design-system";
import { type ReactNode } from "react";

export interface ScreenHeaderProps {
  title: ReactNode;
  /** Shows a back arrow that calls this. Leave it out on a tab's own screen. */
  onBack?: () => void;
  /** What the back arrow returns to, for its accessible name. */
  backLabel?: string;
  /** Shows a close button that calls this. Given when the chat is in a frame it can close. */
  onClose?: (() => void) | undefined;
  /** Icon buttons for the screen, such as Expand article, before the close button. */
  actions?: ReactNode;
}

/** Closes the chat's frame. Needed on a phone, where the chat covers the page's own button. */
export function CloseButton({ onClose, className }: { onClose: () => void; className?: string }) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Close chat"
      className={className}
      onClick={onClose}
    >
      <Icon name="x" />
    </Button>
  );
}

/** The bar at the top of every screen but Home: a centred title, and a way back on sub-screens. */
export function ScreenHeader({
  title,
  onBack,
  backLabel = "Back",
  onClose,
  actions,
}: ScreenHeaderProps) {
  const close = onClose ? <CloseButton onClose={onClose} /> : null;
  return (
    <header
      className={cn(
        "grid h-14 shrink-0 items-center px-2",
        // Each side as wide as the other, so the title stays centred. With an action, the close
        // button keeps the place it has on every other screen.
        actions ? "grid-cols-[4.75rem_1fr_4.75rem]" : "grid-cols-[2.5rem_1fr_2.5rem]",
      )}
    >
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
      {actions ? (
        <div className="flex items-center gap-1">
          {actions}
          {close}
        </div>
      ) : (
        close
      )}
    </header>
  );
}
