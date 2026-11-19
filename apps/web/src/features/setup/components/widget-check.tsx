"use client";

import { Icon, QueryDetail, Spinner } from "@helpwren/design-system";

import { formatTimeAgo } from "@/lib/format-time";

import { getWidgetSighting } from "../actions";

/** Often enough to turn green moments after the snippet goes in, rarely enough to cost nothing. */
const POLL_MS = 4000;

const hostOf = (origin: string) => {
  try {
    return new URL(origin).host;
  } catch {
    return origin;
  }
};

const when = (iso: string) => {
  const ago = formatTimeAgo(iso);
  return ago === "now" ? "just now" : ago;
};

/**
 * The live install check: waits for the widget to load on a real site and says where. The
 * widget's first request for its look is what records it (`GET /api/widget`).
 */
export function WidgetCheck() {
  return (
    <QueryDetail
      queryKey={["setup", "widget-sighting"]}
      queryFn={() => getWidgetSighting()}
      refetchInterval={POLL_MS}
      refetchOnWindowFocus
      className="rounded-lg border"
      contentClassName="p-4"
      renderEmpty={() => (
        <p aria-live="polite" className="flex items-center gap-3 p-4 text-sm">
          <Spinner className="size-4" />
          <span>
            Waiting for the widget on your site. Paste the snippet below, then open a page that has
            it.
          </span>
        </p>
      )}
    >
      {(sighting) => (
        <p aria-live="polite" className="flex items-center gap-3 text-sm">
          <Icon name="check-circle" className="text-status-resolved size-5" />
          <span>
            <span className="font-medium">
              Seen on {hostOf(sighting.lastOrigin)} {when(sighting.lastSeenAt)}
            </span>
            {sighting.firstOrigin !== sighting.lastOrigin ? (
              <span className="text-muted-foreground">
                {" "}
                First seen on {hostOf(sighting.firstOrigin)}.
              </span>
            ) : null}
          </span>
        </p>
      )}
    </QueryDetail>
  );
}
