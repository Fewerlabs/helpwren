"use client";

import { QueryDetail } from "@helpwren/design-system";
import { type ReactNode } from "react";

import { useHelpwren } from "@/lib/helpwren-context";

import { VISITORS_QUERY_KEY } from "../hooks/use-visitors";
import { RecentPages, VisitorFacts } from "./visitor-facts";

export interface ContactVisitorProps {
  contactId: string;
  /** Classes for the list of details, such as the width of its label column. */
  factsClassName?: string;
  /** Wraps what is shown, such as in a titled section. Nothing is drawn when nothing is known. */
  frame: (content: ReactNode) => ReactNode;
}

/**
 * What a contact's browser has said about them, for the side of a conversation or a contact:
 * where they are, their local time, what they use, how often they come, and the pages they
 * looked at. Shows nothing for someone whose browser never checked in.
 */
export function ContactVisitor({ contactId, factsClassName, frame }: ContactVisitorProps) {
  const getClient = useHelpwren();
  return (
    <QueryDetail
      queryKey={[...VISITORS_QUERY_KEY, "contact", contactId]}
      queryFn={() => getClient().visitors.latestForContact(contactId)}
      renderLoading={() => null}
      renderEmpty={() => null}
      // Not the place to dwell on it: the rest of the panel still works.
      renderError={() => null}
    >
      {(visitor) =>
        frame(
          <div className="grid gap-3">
            <VisitorFacts visitor={visitor} className={factsClassName} />
            {visitor.recentPages.length > 1 ? (
              <div className="grid gap-1.5">
                <p className="text-muted-foreground text-xs">Recent pages</p>
                <RecentPages pages={visitor.recentPages} />
              </div>
            ) : null}
          </div>,
        )
      }
    </QueryDetail>
  );
}
