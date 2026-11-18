import type { ReactNode } from "react";

import { cn } from "#lib/cn";

import { Button } from "../base/button/button";
import { Icon } from "../base/icon/icon";
import { LinearProgress } from "../base/linear-progress/linear-progress";
import { Skeleton } from "../base/skeleton/skeleton";

/** The options of TanStack Query that these components pass through. */
export interface QueryBehaviour {
  /** Set false to hold the request back, for example until an id is known. */
  enabled?: boolean;
  /** How long fetched data counts as fresh, in milliseconds. Fresh data is not refetched. */
  staleTime?: number;
  /** How long unused data stays in the cache, in milliseconds. */
  gcTime?: number;
  /** Refetch on an interval, in milliseconds. */
  refetchInterval?: number | false;
  refetchOnWindowFocus?: boolean;
  /** How many times a failed request is retried before the error is shown. */
  retry?: boolean | number;
}

export interface QueryErrorContext {
  error: unknown;
  retry: () => void;
  /** True while the retry is under way. */
  retrying: boolean;
}

interface StateBlockProps {
  icon: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  role?: "alert" | "status";
  className?: string;
}

function StateBlock({ icon, title, description, action, role, className }: StateBlockProps) {
  return (
    <div
      role={role}
      className={cn("flex flex-col items-center gap-2 px-4 py-10 text-center", className)}
    >
      <span className="text-muted-foreground" aria-hidden="true">
        {icon}
      </span>
      <p className="text-sm font-medium">{title}</p>
      {description === undefined ? null : (
        <p className="text-muted-foreground max-w-sm text-sm">{description}</p>
      )}
      {action === undefined ? null : <div className="mt-2">{action}</div>}
    </div>
  );
}

export function DefaultEmpty({
  title,
  description,
}: {
  title: ReactNode;
  description?: ReactNode;
}) {
  return (
    <StateBlock
      role="status"
      icon={<Icon name="tray" className="size-8" weight="light" />}
      title={title}
      {...(description === undefined ? {} : { description })}
    />
  );
}

export function DefaultError({
  title,
  retryLabel,
  retry,
  retrying,
}: {
  title: ReactNode;
  retryLabel: string;
  retry: () => void;
  retrying: boolean;
}) {
  return (
    <StateBlock
      role="alert"
      icon={<Icon name="warning-circle" className="text-destructive size-8" weight="light" />}
      title={title}
      action={
        <Button variant="secondary" size="sm" onClick={retry} loading={retrying}>
          {retryLabel}
        </Button>
      }
    />
  );
}

/** A compact error for when content is already on screen, such as a failed "load more". */
export function InlineError({
  title,
  retryLabel,
  retry,
  retrying,
}: {
  title: ReactNode;
  retryLabel: string;
  retry: () => void;
  retrying: boolean;
}) {
  return (
    <div role="alert" className="flex flex-wrap items-center justify-center gap-3 px-4 py-3">
      <p className="text-destructive text-sm">{title}</p>
      <Button variant="secondary" size="sm" onClick={retry} loading={retrying}>
        {retryLabel}
      </Button>
    </div>
  );
}

/**
 * Holds the progress bar flush against the top edge of the container, above any
 * padding, and keeps it there while the content scrolls. It takes up no height,
 * so nothing moves when the bar appears.
 */
export function StickyProgress({ active, label }: { active: boolean; label: string }) {
  return (
    <div data-slot="query-progress" className="sticky top-0 z-10 h-0">
      {active ? <LinearProgress label={label} className="absolute inset-x-0 top-0" /> : null}
    </div>
  );
}

export function DefaultListLoading({ label, rows }: { label: string; rows: number }) {
  return (
    <div role="status" aria-label={label} className="grid gap-3 py-2">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-full" />
          <div className="grid flex-1 gap-2">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3.5 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DefaultDetailLoading({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="grid gap-3 py-2">
      <Skeleton className="h-6 w-1/2" />
      <Skeleton className="h-3.5 w-full" />
      <Skeleton className="h-3.5 w-5/6" />
      <Skeleton className="h-3.5 w-2/3" />
    </div>
  );
}
