import type { ComponentProps } from "react";

import { cn } from "#lib/cn";

import { Icon, type IconWeight } from "../icon/icon";
import type { IconName } from "../icon/registry";
import { Tooltip } from "../tooltip/tooltip";
import { Button } from "./button";

// Written out in full, so Tailwind finds every class. The collapsed button is 40px square,
// the smallest tap target a finger hits reliably.
const collapse = {
  sm: { button: "max-sm:size-10 max-sm:px-0", label: "max-sm:sr-only", tooltip: "sm:hidden" },
  md: { button: "max-md:size-10 max-md:px-0", label: "max-md:sr-only", tooltip: "md:hidden" },
} as const;

export interface ActionButtonProps extends Omit<
  ComponentProps<typeof Button>,
  "children" | "size" | "aria-label" | "aria-labelledby"
> {
  icon: IconName;
  iconWeight?: IconWeight;
  iconClassName?: string;
  /** The words beside the icon. On a narrow screen they become the tooltip. */
  label: string;
  /**
   * What the button acts on, such as "Sam Rivera" for a Deactivate button in a list of people.
   * It is added to the name after the label but never shown, so the name ("Deactivate, Sam
   * Rivera") still starts with the words on screen, which is what voice control listens for.
   */
  target?: string;
  /** The width below which only the icon shows. */
  collapseBelow?: keyof typeof collapse;
  size?: "md" | "sm";
}

/**
 * A button with an icon and a label that drops to the icon alone on a narrow screen, where a
 * row of worded buttons would squeeze out what they act on. The label stays the start of the
 * button's name and becomes its tooltip, so nothing is lost.
 */
export function ActionButton({
  icon,
  iconWeight = "regular",
  iconClassName,
  label,
  collapseBelow = "sm",
  size = "sm",
  className,
  target,
  ...props
}: ActionButtonProps) {
  const styles = collapse[collapseBelow];
  return (
    // The tooltip repeats the visible label on a wide screen, so it shows only when collapsed.
    <Tooltip content={label} className={styles.tooltip}>
      <Button
        size={size}
        {...(target ? { "aria-label": `${label}, ${target}` } : {})}
        className={cn(styles.button, className)}
        {...props}
      >
        <Icon name={icon} weight={iconWeight} className={iconClassName} />
        <span className={styles.label}>{label}</span>
      </Button>
    </Tooltip>
  );
}
