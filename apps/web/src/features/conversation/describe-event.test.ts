import { type ConversationEvent } from "@helpwren/core";
import { describe, expect, it } from "vitest";

import { describeEvent } from "./describe-event";

const SAM = "11111111-1111-4111-8111-111111111111";
const ADA = "22222222-2222-4222-8222-222222222222";
const names: Record<string, string> = { [SAM]: "Sam", [ADA]: "Ada" };
const nameOf = (id: string | null) => (id ? (names[id] ?? "Someone") : "The system");

function event(change: Pick<ConversationEvent, "kind" | "data">, actorId: string | null = SAM) {
  return {
    id: "33333333-3333-4333-8333-333333333333",
    conversationId: "44444444-4444-4444-8444-444444444444",
    actorId,
    createdAt: "2026-11-18T10:00:00Z",
    ...change,
  } as ConversationEvent;
}

describe("describeEvent, for the team", () => {
  it.each([
    [
      { kind: "ticket_created", data: { number: 1042, subject: "Refund" } },
      "Sam converted this to ticket #1042",
    ],
    [
      { kind: "status_changed", data: { from: "open", to: "resolved" } },
      "Sam marked this as resolved",
    ],
    [
      { kind: "status_changed", data: { from: "open", to: "pending" } },
      "Sam marked this as waiting",
    ],
    [{ kind: "status_changed", data: { from: "resolved", to: "open" } }, "Sam reopened this"],
    [{ kind: "assigned", data: { to: ADA } }, "Sam assigned this to Ada"],
    [{ kind: "assigned", data: { to: SAM } }, "Sam took this"],
    [{ kind: "assigned", data: { to: null } }, "Sam unassigned this"],
    [
      { kind: "priority_changed", data: { from: "normal", to: "high" } },
      "Sam set the priority to high",
    ],
  ] as const)("%j reads %s", (change, expected) => {
    expect(describeEvent(event(change), nameOf)).toBe(expected);
  });

  it("names the system when nobody did it", () => {
    expect(
      describeEvent(
        event({ kind: "status_changed", data: { from: "open", to: "closed" } }, null),
        nameOf,
      ),
    ).toBe("The system marked this as closed");
  });
});

describe("describeEvent, for the contact", () => {
  it.each([
    [
      { kind: "ticket_created", data: { number: 1042, subject: "Refund" } },
      "This became ticket #1042",
    ],
    [{ kind: "status_changed", data: { from: "open", to: "resolved" } }, "Marked as resolved"],
    [{ kind: "status_changed", data: { from: "resolved", to: "open" } }, "Reopened"],
  ] as const)("%j reads %s, naming nobody", (change, expected) => {
    expect(describeEvent(event(change))).toBe(expected);
  });
});

describe("describeEvent, for a rating", () => {
  const rated = event({ kind: "rated", data: { score: 4 } });

  it("names who rated, for the team", () => {
    expect(describeEvent(rated, nameOf)).toBe("Sam rated this 4 out of 5");
  });

  it("speaks to the contact, who gave it", () => {
    expect(describeEvent(rated)).toBe("You rated this 4 out of 5");
  });
});
