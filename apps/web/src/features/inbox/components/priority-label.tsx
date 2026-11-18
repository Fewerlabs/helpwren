import { type ConversationPriority } from "@helpwren/core";
import { cn, Icon, type IconName } from "@helpwren/design-system";

import { priorities } from "../labels";

// Bars that fill as the priority rises, each in its own colour, so a column of them can be
// read at a glance and never by colour alone.
const looks: Record<ConversationPriority, { icon: IconName; colour: string }> = {
  low: { icon: "cell-signal-low", colour: "text-biro" },
  normal: { icon: "cell-signal-medium", colour: "text-ochre" },
  high: { icon: "cell-signal-high", colour: "text-pen" },
};

/** A priority as an icon and its name. */
export function PriorityLabel({ priority }: { priority: ConversationPriority }) {
  const look = looks[priority];
  return (
    <span className={cn("flex items-center gap-1.5", priority === "high" && "font-medium")}>
      <Icon name={look.icon} weight="bold" className={cn("size-4", look.colour)} />
      {priorities[priority]}
    </span>
  );
}
