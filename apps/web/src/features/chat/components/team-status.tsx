"use client";

import { cn } from "@helpwren/design-system";

import { useTeamOnline } from "../hooks/use-team-online";

/**
 * Whether the team is around: "We're online" with a green dot while someone has the dashboard
 * open, otherwise a promise to reply. Nothing until it is known, so it never flickers from one
 * to the other as the chat opens.
 */
export function TeamStatus({ className }: { className?: string }) {
  const online = useTeamOnline();
  if (online === undefined) return null;

  return (
    <span className={cn("text-muted-foreground flex items-center gap-1.5 text-xs", className)}>
      {online ? (
        <>
          <span aria-hidden="true" className="bg-status-resolved size-2 shrink-0 rounded-full" />
          We’re online
        </>
      ) : (
        "We’ll reply as soon as we can"
      )}
    </span>
  );
}
