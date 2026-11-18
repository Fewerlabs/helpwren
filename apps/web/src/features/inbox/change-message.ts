import { type ConversationChanges, type ConversationWithContact } from "@helpwren/core";

import { priorities, statuses, ticketLabel } from "./labels";

/** What the inbox can change about a conversation: its fields, or turning it into a ticket. */
export type InboxChange = ConversationChanges | { ticketSubject: string };

/** Says what a change did, for the toast shown once it is saved. */
export function changeMessage(change: InboxChange, conversation: ConversationWithContact): string {
  const what = conversation.type === "ticket" ? "Ticket" : "Conversation";
  if ("ticketSubject" in change) return `Converted to ticket ${ticketLabel(conversation)}`;
  if (change.status === "resolved") return `${what} resolved`;
  if (change.status === "closed") return `${what} closed`;
  if (change.status) return `${what} marked as ${statuses[change.status].label.toLowerCase()}`;
  if (change.priority) return `Priority set to ${priorities[change.priority].toLowerCase()}`;
  if (change.assigneeId === null) return `${what} unassigned`;
  if (change.assigneeId) return `${what} assigned`;
  return "Changes saved";
}
