import {
  type ConversationPriority,
  type ConversationStatus,
  type ConversationWithContact,
} from "@helpwren/core";
import { type StatusName } from "@helpwren/design-system";

/** What each status is called on screen, and the chip that shows it. */
export const statuses: Record<ConversationStatus, { label: string; chip: StatusName }> = {
  open: { label: "Open", chip: "open" },
  pending: { label: "Waiting", chip: "waiting" },
  resolved: { label: "Resolved", chip: "resolved" },
  closed: { label: "Closed", chip: "closed" },
};

export const priorities: Record<ConversationPriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
};

/** A ticket's number as people quote it, such as `#1042`. */
export function ticketLabel(conversation: Pick<ConversationWithContact, "ticketNumber">): string {
  return conversation.ticketNumber === null ? "" : `#${conversation.ticketNumber}`;
}
