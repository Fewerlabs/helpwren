import {
  type ConversationPriority,
  type ConversationStatus,
  type TeamMember,
} from "@helpwren/core";
import { Avatar, StatusChip, type OptionListOption } from "@helpwren/design-system";

import { PriorityLabel } from "./components/priority-label";
import { priorities, statuses } from "./labels";

// The choices for a conversation's status, priority and assignee, each drawn as it appears
// once chosen. Shared by the details panel, the tickets table and its filters.

export const statusOptions: OptionListOption[] = (
  Object.keys(statuses) as ConversationStatus[]
).map((value) => ({
  value,
  label: statuses[value].label,
  content: <StatusChip status={statuses[value].chip} size="sm" />,
}));

export const priorityOptions: OptionListOption[] = (
  Object.keys(priorities) as ConversationPriority[]
).map((value) => ({
  value,
  label: priorities[value],
  content: <PriorityLabel priority={value} />,
}));

/** The value that stands for "assigned to nobody", which an option cannot express as null. */
export const NOBODY = "nobody";

/** A team member as an avatar and their name. */
export function Person({ name }: { name: string }) {
  return (
    <>
      <Avatar name={name} size="sm" className="size-5 text-[0.5625rem]" />
      <span className="truncate">{name}</span>
    </>
  );
}

export const unassigned = <span className="text-muted-foreground">Unassigned</span>;

/** Nobody, then everyone on the team. */
export function assigneeOptions(team: readonly TeamMember[]): OptionListOption[] {
  return [
    { value: NOBODY, label: "Unassigned", content: unassigned },
    ...team.map((member) => ({
      value: member.id,
      label: member.name,
      content: <Person name={member.name} />,
      // Someone deactivated cannot be given more work, but still shows on what they hold.
      disabled: !member.active,
    })),
  ];
}
