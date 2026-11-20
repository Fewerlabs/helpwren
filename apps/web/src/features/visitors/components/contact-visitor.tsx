"use client";

import { Expandable, Icon, QueryDetail } from "@helpwren/design-system";
import { useId, useState, type ReactNode } from "react";

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
              <RecentPagesToggle pages={visitor.recentPages} />
            ) : null}
          </div>,
        )
      }
    </QueryDetail>
  );
}

/**
 * The pages a visitor looked at, folded away until asked for, and scrolling once there are more
 * than fit, so a long visit does not push the rest of the panel down.
 */
function RecentPagesToggle({ pages }: { pages: Parameters<typeof RecentPages>[0]["pages"] }) {
  const [open, setOpen] = useState(false);
  const contentId = useId();
  return (
    <div className="grid">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
        className="text-muted-foreground hover:text-foreground focus-visible:outline-ring -mx-1 flex items-center gap-1.5 rounded-sm px-1 py-0.5 text-left text-xs transition-colors focus-visible:outline-2"
        onClick={() => {
          setOpen((current) => !current);
        }}
      >
        <span className="flex-1">
          Recent pages <span className="tabular-nums">({pages.length})</span>
        </span>
        <Icon
          name="caret-down"
          className={
            open ? "size-3 rotate-180 transition-transform" : "size-3 transition-transform"
          }
        />
      </button>
      <Expandable open={open} id={contentId}>
        <div className="mt-1.5 max-h-48 overflow-y-auto pr-1">
          <RecentPages pages={pages} />
        </div>
      </Expandable>
    </div>
  );
}
