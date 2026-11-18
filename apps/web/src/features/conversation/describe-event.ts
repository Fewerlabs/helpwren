import { type ConversationEvent } from "@helpwren/core";

const statusNames = { open: "Open", pending: "Waiting", resolved: "Resolved", closed: "Closed" };
const priorityNames = { low: "Low", normal: "Normal", high: "High" };

const done = (status: string) => status === "resolved" || status === "closed";

/**
 * One line saying what an event was. With `nameOf`, for the team: who did it, by name. Without
 * it, for the contact: only where their request now stands.
 */
export function describeEvent(
  event: ConversationEvent,
  nameOf?: (id: string | null) => string,
): string {
  if (!nameOf) {
    if (event.kind === "ticket_created") return `This became ticket #${event.data.number}`;
    if (event.kind === "status_changed") {
      if (done(event.data.from) && !done(event.data.to)) return "Reopened";
      return `Marked as ${statusNames[event.data.to].toLowerCase()}`;
    }
    return "Updated";
  }

  const actor = nameOf(event.actorId);
  switch (event.kind) {
    case "ticket_created":
      return `${actor} converted this to ticket #${event.data.number}`;
    case "status_changed":
      return done(event.data.from) && !done(event.data.to)
        ? `${actor} reopened this`
        : `${actor} marked this as ${statusNames[event.data.to].toLowerCase()}`;
    case "assigned":
      return event.data.to === null
        ? `${actor} unassigned this`
        : event.data.to === event.actorId
          ? `${actor} took this`
          : `${actor} assigned this to ${nameOf(event.data.to)}`;
    case "priority_changed":
      return `${actor} set the priority to ${priorityNames[event.data.to].toLowerCase()}`;
  }
}
