import { type ConversationWithContact } from "@helpwren/core";
import { StatusChip, type StatusName } from "@helpwren/design-system";

// In the visitor's words: "pending" is the team waiting on them.
const statuses: Record<ConversationWithContact["status"], { label: string; chip: StatusName }> = {
  open: { label: "Open", chip: "open" },
  pending: { label: "Waiting on you", chip: "waiting" },
  resolved: { label: "Resolved", chip: "resolved" },
  closed: { label: "Closed", chip: "closed" },
};

/** Tells a visitor that their conversation is a tracked ticket, and where it stands. */
export function TicketBar({ ticket }: { ticket: ConversationWithContact }) {
  const status = statuses[ticket.status];

  return (
    <div className="border-rule bg-muted/50 flex items-center gap-2 border-y px-4 py-2 text-xs">
      <p className="min-w-0 flex-1 truncate">
        <span className="font-mono">Ticket #{ticket.ticketNumber}</span>
        {ticket.subject ? <span className="text-muted-foreground"> · {ticket.subject}</span> : null}
      </p>
      <StatusChip status={status.chip} size="sm">
        {status.label}
      </StatusChip>
    </div>
  );
}
