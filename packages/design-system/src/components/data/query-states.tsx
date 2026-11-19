import type { ReactNode } from "react";

import { cn } from "#lib/cn";

import { Button } from "../base/button/button";
import { Icon } from "../base/icon/icon";
import { LinearProgress } from "../base/linear-progress/linear-progress";
import { Skeleton } from "../base/skeleton/skeleton";
import { AppLoader } from "../shared/app-loader/app-loader";
import { EmptyState } from "../shared/empty-state/empty-state";

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
    <EmptyState
      role="status"
      size="sm"
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

/**
 * The first load of a list or a record: the app's loader, in the middle of wherever the
 * content will be. Nothing is guessed about the shape of what is coming.
 */
export function DefaultLoading({ label }: { label: string }) {
  return <AppLoader label={label} size="sm" />;
}

/**
 * The first load of a record's panel, in the shape most of them take: a name beside an avatar,
 * then sections of labelled facts. The panel keeps its place instead of jumping from a spinner
 * to content.
 */
export function DetailSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} data-slot="detail-skeleton">
      <div className="border-rule flex items-center gap-3 border-b px-3 py-3.5">
        <Skeleton className="size-10 shrink-0 rounded-full" />
        <div className="grid flex-1 gap-2">
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
      {[4, 3].map((rows, section) => (
        <div key={section} className="border-rule grid gap-3 border-b px-3 py-3">
          <Skeleton className="h-2.5 w-16" />
          {Array.from({ length: rows }, (_, row) => (
            <div key={row} className="grid grid-cols-[5rem_minmax(0,1fr)] gap-3">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
