"use client";

import { Avatar, Badge, Button, Icon, Link, QueryDetail } from "@helpwren/design-system";
import NextLink from "next/link";
import { type ReactNode } from "react";

import { Panel, PanelHeader } from "@/features/dashboard";
import { useHelpwren } from "@/lib/helpwren-context";

import { formatDuration, visitorName } from "../format";
import { REFRESH_EVERY_MS, VISITORS_QUERY_KEY } from "../hooks/use-visitors";
import { Outreach } from "./outreach";
import { isOnline, RecentPages, VisitorFacts } from "./visitor-facts";

const eyebrow = "text-muted-foreground text-2xs px-3 pt-3 pb-2 font-mono tracking-wider uppercase";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-rule border-b pb-3 last:border-b-0">
      <h3 className={eyebrow}>{title}</h3>
      <div className="px-3">{children}</div>
    </section>
  );
}

export interface VisitorDetailsProps {
  visitorId: string;
  onClose: () => void;
}

/** One visitor: who and where they are, what they have looked at, and writing to them first. */
export function VisitorDetails({ visitorId, onClose }: VisitorDetailsProps) {
  const getClient = useHelpwren();

  return (
    <Panel aria-label="Visitor">
      <PanelHeader className="justify-between">
        <h2 className="font-semibold">Visitor</h2>
        <Button variant="ghost" size="icon-sm" aria-label="Close visitor" onClick={onClose}>
          <Icon name="x" />
        </Button>
      </PanelHeader>
      <QueryDetail
        queryKey={[...VISITORS_QUERY_KEY, "one", visitorId]}
        queryFn={() => getClient().visitors.get(visitorId)}
        // Kept fresh, so a message the visitor's browser picks up shows here as it happens.
        refetchInterval={REFRESH_EVERY_MS}
        messages={{
          loading: "Loading visitor",
          notFound: "This visitor could not be found.",
          notFoundDescription: "Their visit may have ended long enough ago to be cleared.",
          error: "This visitor could not be loaded.",
        }}
        notFoundAction={
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        }
        className="min-h-0 flex-1 overflow-y-auto"
      >
        {(visitor) => {
          const name = visitorName(visitor);
          const online = isOnline(visitor);
          return (
            <>
              <div className="border-rule flex items-center gap-3 border-b px-3 py-3.5">
                <Avatar name={name} />
                <div className="grid min-w-0 gap-1">
                  <p className="truncate font-semibold">{name}</p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant={online ? "accent" : "outline"}>
                      {online ? "On the site" : "Left"}
                    </Badge>
                    {online ? (
                      <span className="text-muted-foreground text-xs">
                        for {formatDuration(visitor.sessionStartedAt)}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <Section title="Details">
                <VisitorFacts visitor={visitor} className="grid-cols-[5.5rem_minmax(0,1fr)]" />
                {visitor.contact ? (
                  <p className="pt-3 text-xs">
                    <Link asChild>
                      <NextLink href={`/dashboard/contacts?contact=${visitor.contact.id}`}>
                        View contact
                      </NextLink>
                    </Link>
                  </p>
                ) : null}
              </Section>

              {visitor.recentPages.length > 0 ? (
                <Section title="Recent pages">
                  <RecentPages pages={visitor.recentPages} />
                </Section>
              ) : null}

              <Section title="Start a conversation">
                <Outreach visitor={visitor} />
              </Section>
            </>
          );
        }}
      </QueryDetail>
    </Panel>
  );
}
