import { type ConversationWithContact } from "@helpwren/core";
import { describe, expect, it } from "vitest";

import { changeMessage } from "./change-message";

const chat = { type: "chat", ticketNumber: null } as ConversationWithContact;
const ticket = { type: "ticket", ticketNumber: 1042 } as ConversationWithContact;

describe("changeMessage", () => {
  it("says what happened to the status, naming a ticket as one", () => {
    expect(changeMessage({ status: "resolved" }, chat)).toBe("Conversation resolved");
    expect(changeMessage({ status: "closed" }, ticket)).toBe("Ticket closed");
    expect(changeMessage({ status: "open" }, chat)).toBe("Conversation marked as open");
    expect(changeMessage({ status: "pending" }, ticket)).toBe("Ticket marked as waiting");
  });

  it("covers priority, the assignee and becoming a ticket", () => {
    expect(changeMessage({ priority: "high" }, chat)).toBe("Priority set to high");
    expect(changeMessage({ assigneeId: null }, chat)).toBe("Conversation unassigned");
    expect(changeMessage({ assigneeId: "33333333-3333-4333-8333-333333333333" }, ticket)).toBe(
      "Ticket assigned",
    );
    expect(changeMessage({ ticketSubject: "Refund" }, ticket)).toBe("Converted to ticket #1042");
  });
});
