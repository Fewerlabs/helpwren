import { type Visitor } from "@helpwren/core";
import { cn, Icon, Link } from "@helpwren/design-system";
import { type ReactNode } from "react";

import { formatTimeAgo } from "@/lib/format-time";

import {
  browserLabel,
  countryFlag,
  devices,
  languageName,
  localTime,
  placeLabel,
  shortUrl,
} from "../format";
import { ACTIVE_WITHIN_SECONDS } from "../hooks/use-visitors";

const dateFormat = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </>
  );
}

/** Whether a visitor checked in recently enough to count as on the site now. */
export function isOnline(visitor: Pick<Visitor, "lastSeenAt">, now = new Date()): boolean {
  return now.getTime() - new Date(visitor.lastSeenAt).getTime() < ACTIVE_WITHIN_SECONDS * 1000;
}

export interface VisitorFactsProps {
  visitor: Visitor;
  /** Classes for the list, such as the width of its label column. */
  className?: string | undefined;
}

/**
 * What a visitor's browser has said about them: where they are, what they use, how often they
 * come, and the page they are on. Only what is known is shown.
 */
export function VisitorFacts({ visitor, className }: VisitorFactsProps) {
  const { location, timezone, device, language, page, referrer } = visitor;
  const place = placeLabel(location);
  const time = timezone ? localTime(timezone) : null;
  const browser = browserLabel(visitor);

  return (
    <dl className={cn("grid gap-x-3 gap-y-2 text-xs", className)}>
      {place ? (
        <Row label="Location">
          {location.country ? (
            <span aria-hidden="true">{countryFlag(location.country)} </span>
          ) : null}
          {place}
        </Row>
      ) : null}
      {time ? (
        <Row label="Local time">
          {time} <span className="text-muted-foreground">({timezone})</span>
        </Row>
      ) : null}
      {browser ? <Row label="Browser">{browser}</Row> : null}
      {device ? (
        <Row label="Device">
          <span className="inline-flex items-center gap-1">
            <Icon name={devices[device].icon} className="size-3.5" />
            {devices[device].label}
          </span>
        </Row>
      ) : null}
      {language ? <Row label="Language">{languageName(language)}</Row> : null}
      <Row label="First seen">{dateFormat.format(new Date(visitor.firstSeenAt))}</Row>
      <Row label="Last seen">{isOnline(visitor) ? "Now" : formatTimeAgo(visitor.lastSeenAt)}</Row>
      <Row label="Sessions">
        <span className="tabular-nums">{visitor.sessionCount}</span>
      </Row>
      <Row label={isOnline(visitor) ? "Page" : "Last page"}>
        <Link href={page.url} external>
          {page.title ?? shortUrl(page.url)}
        </Link>
      </Row>
      {referrer ? (
        <Row label="Came from">
          <Link href={referrer} external>
            {shortUrl(referrer)}
          </Link>
        </Row>
      ) : null}
    </dl>
  );
}

/** The last pages a visitor looked at, newest first. */
export function RecentPages({ pages }: { pages: Visitor["recentPages"] }) {
  if (pages.length === 0) return null;
  return (
    <ol aria-label="Recent pages" className="grid gap-1.5 text-xs">
      {pages.map((page) => (
        <li key={`${page.url}:${page.at}`} className="flex items-baseline justify-between gap-2">
          <Link href={page.url} external className="min-w-0 truncate">
            {page.title ?? shortUrl(page.url)}
          </Link>
          <span className="text-muted-foreground text-2xs shrink-0 tabular-nums">
            {formatTimeAgo(page.at)}
          </span>
        </li>
      ))}
    </ol>
  );
}
