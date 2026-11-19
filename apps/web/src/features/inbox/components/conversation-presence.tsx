"use client";

import { type TeamMember } from "@helpwren/core";
import { Avatar, cn, typingLabel } from "@helpwren/design-system";

import { useTyping } from "@/features/conversation";

import { useViewers } from "../hooks/use-viewers";

/** "Sam is viewing", "Sam and Ada are viewing", or "3 teammates are viewing". */
function viewingLabel(names: readonly string[]): string {
  const [first, second] = names;
  if (names.length === 1) return `${first} is viewing`;
  if (names.length === 2) return `${first} and ${second} are viewing`;
  return `${names.length} teammates are viewing`;
}

export interface ConversationPresenceProps {
  conversationId: string;
  contactId: string;
  /** The signed-in team member, who is not shown to themselves. */
  agentId: string;
  team: readonly TeamMember[];
}

/**
 * The teammates who have this conversation open too, and whether one of them is writing a
 * reply, so two people do not answer at once. A slim strip under the header, not in it: the
 * header has no room to spare on a phone, and this should never cost the contact's name.
 */
export function ConversationPresence({
  conversationId,
  contactId,
  agentId,
  team,
}: ConversationPresenceProps) {
  const viewers = useViewers(conversationId);
  const { typists } = useTyping(conversationId);
  const memberOf = (id: string) => team.find((member) => member.id === id);

  const typing = typists
    .map((typist) => typist.userId)
    .filter((id) => id !== contactId && id !== agentId)
    .flatMap((id) => memberOf(id) ?? []);
  const others = [...new Set([...viewers, ...typing.map((member) => member.id)])]
    .filter((id) => id !== agentId)
    .flatMap((id) => memberOf(id) ?? []);

  const label =
    typing.length > 0
      ? typingLabel(typing.map((member) => member.name))
      : others.length > 0
        ? viewingLabel(others.map((member) => member.name))
        : "";

  return (
    // Always there, so screen readers hear when someone arrives; drawn only while someone is.
    <div
      role="status"
      className={cn(
        "flex shrink-0 items-center gap-2",
        others.length > 0 && "border-rule bg-muted/40 border-b px-4 py-1.5",
      )}
    >
      {others.length > 0 ? (
        <>
          <span className="flex -space-x-1.5" aria-hidden="true">
            {others.slice(0, 3).map((member) => (
              <Avatar
                key={member.id}
                name={member.name}
                src={member.photo}
                size="sm"
                className="ring-card size-5 text-[0.5625rem] ring-2"
              />
            ))}
          </span>
          <span
            className={cn(
              "text-2xs truncate",
              typing.length > 0 ? "text-foreground font-medium" : "text-muted-foreground",
            )}
          >
            {label}
          </span>
        </>
      ) : null}
    </div>
  );
}
