/** How much of a message a team member's notification shows. */
export const AGENT_PREVIEW_LENGTH = 100;

/** What the dashboard's service worker is handed for one notification. */
export interface AgentPushPayload {
  /** Who wrote: the contact's name, or how they can be reached. */
  title: string;
  /** The start of what they wrote, never all of it. */
  body: string;
  /** The conversation in the inbox, on this install. */
  url: string;
  /** One notification per conversation: a newer one replaces it. */
  tag: string;
}

export interface AgentPushInput {
  conversationId: string;
  contact: { name: string | null; email: string | null; phone: string | null };
  /** The message's text, or `null` for one that is only files. */
  body: string | null;
}

/** The start of a message on one line, cut at a word where it can be. */
export function previewOf(body: string | null, length = AGENT_PREVIEW_LENGTH): string {
  if (body === null) return "Sent a file.";
  const text = body.replace(/\s+/g, " ").trim();
  if (text === "") return "Sent a file.";
  if (text.length <= length) return text;
  const cut = text.slice(0, length - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > length / 2 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

/**
 * The notification for a new message from a contact. It carries only what the lock screen may
 * show: the contact's name and a short preview. The rest stays in the inbox.
 */
export function buildAgentPushPayload({
  conversationId,
  contact,
  body,
}: AgentPushInput): AgentPushPayload {
  return {
    title: contact.name ?? contact.email ?? contact.phone ?? "Guest",
    body: previewOf(body),
    url: `/dashboard/inbox?view=all&c=${encodeURIComponent(conversationId)}`,
    tag: conversationId,
  };
}
