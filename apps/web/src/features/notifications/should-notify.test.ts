import { describe, expect, it } from "vitest";

import { parsePreferences } from "./preferences";
import { shouldNotify, type NotifyQuestion } from "./should-notify";

const ME = "a0000000-0000-4000-8000-000000000001";
const SOMEONE = "a0000000-0000-4000-8000-000000000002";

function ask(overrides: Partial<NotifyQuestion> = {}): boolean {
  return shouldNotify({
    conversation: { assigneeId: null, lastMessageAt: "2026-11-18T10:05:00Z", unreadForAgents: 1 },
    lastSeenAt: undefined,
    since: "2026-11-18T10:00:00Z",
    agentId: ME,
    about: "all",
    ...overrides,
  });
}

describe("shouldNotify", () => {
  it("says yes to an unread message that arrived after the dashboard opened", () => {
    expect(ask()).toBe(true);
  });

  it("says no to a change that brought no new message", () => {
    expect(ask({ lastSeenAt: "2026-11-18T10:05:00Z" })).toBe(false);
    expect(ask({ since: "2026-11-18T10:30:00Z" })).toBe(false);
  });

  it("says no once the team has read it, such as their own reply", () => {
    expect(
      ask({
        conversation: {
          assigneeId: null,
          lastMessageAt: "2026-11-18T10:05:00Z",
          unreadForAgents: 0,
        },
      }),
    ).toBe(false);
  });

  it("leaves out somebody else's conversations when asked to", () => {
    const theirs = {
      assigneeId: SOMEONE,
      lastMessageAt: "2026-11-18T10:05:00Z",
      unreadForAgents: 1,
    };
    expect(ask({ conversation: theirs, about: "mine" })).toBe(false);
    expect(ask({ conversation: theirs, about: "all" })).toBe(true);
    expect(ask({ conversation: { ...theirs, assigneeId: ME }, about: "mine" })).toBe(true);
    expect(ask({ about: "mine" })).toBe(true);
  });
});

describe("parsePreferences", () => {
  it("starts with everything off, and survives damaged storage", () => {
    const off = { desktop: false, sound: false, about: "all" };
    expect(parsePreferences(null)).toEqual(off);
    expect(parsePreferences("not json")).toEqual(off);
    expect(parsePreferences('{"about":"everything"}')).toEqual(off);
    expect(parsePreferences('{"sound":true}')).toEqual({ ...off, sound: true });
  });
});
