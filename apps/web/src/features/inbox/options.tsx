import {
  type ConversationPriority,
  type ConversationStatus,
  type Team,
  type TeamMember,
} from "@helpwren/core";
import { Avatar, Icon, StatusChip, type OptionListOption } from "@helpwren/design-system";

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

/** The value that stands for "nobody" or "no team", which an option cannot express as null. */
export const NOBODY = "nobody";

/** A team member as an avatar and their name. */
export function Person({ name, photo }: { name: string; photo?: string | undefined }) {
  return (
    <>
      <Avatar name={name} src={photo} size="sm" className="size-5 text-[0.5625rem]" />
      <span className="truncate">{name}</span>
    </>
  );
}

export const unassigned = <span className="text-muted-foreground">Unassigned</span>;

export const noTeam = <span className="text-muted-foreground">No team</span>;

/** A team as its name beside the icon that stands for teams. */
export function TeamName({ name }: { name: string }) {
  return (
    <>
      <Icon name="users" className="text-muted-foreground size-4 shrink-0" />
      <span className="truncate">{name}</span>
    </>
  );
}

/** No team, then every team. */
export function teamOptions(teams: readonly Team[]): OptionListOption[] {
  return [
    { value: NOBODY, label: "No team", content: noTeam },
    ...teams.map((team) => ({
      value: team.id,
      label: team.name,
      content: <TeamName name={team.name} />,
    })),
  ];
}

/** Nobody, then everyone on the team. */
export function assigneeOptions(team: readonly TeamMember[]): OptionListOption[] {
  return [
    { value: NOBODY, label: "Unassigned", content: unassigned },
    ...team.map((member) => ({
      value: member.id,
      label: member.name,
      content: <Person name={member.name} photo={member.photo} />,
      // Someone deactivated cannot be given more work, but still shows on what they hold.
      disabled: !member.active,
    })),
  ];
}
