import { type Conversation } from "@helpwren/core";

import { type Preferences } from "./preferences";

export interface NotifyQuestion {
  conversation: Pick<Conversation, "assigneeId" | "lastMessageAt" | "unreadForAgents">;
  /** When this conversation's latest message was, the last time it was looked at here. */
  lastSeenAt: string | undefined;
  /** When the dashboard was opened. Nothing older than this is news. */
  since: string;
  agentId: string;
  about: Preferences["about"];
}

/**
 * Whether a change to a conversation is a new message the team member should hear about: one
 * that arrived since the dashboard was opened, is still unread, and is theirs to care about.
 */
export function shouldNotify({
  conversation,
  lastSeenAt,
  since,
  agentId,
  about,
}: NotifyQuestion): boolean {
  const { lastMessageAt, unreadForAgents, assigneeId } = conversation;
  if (!lastMessageAt || unreadForAgents === 0) return false;
  // An assignment or a status change touches the conversation without a new message.
  if (new Date(lastMessageAt) <= new Date(lastSeenAt ?? since)) return false;
  return about === "all" || assigneeId === null || assigneeId === agentId;
}
