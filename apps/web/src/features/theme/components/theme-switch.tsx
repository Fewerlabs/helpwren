"use client";

import { cn, Icon, Tooltip } from "@helpwren/design-system";
import { useRef, type KeyboardEvent } from "react";

import { setThemePreference, useThemePreference, type ThemePreference } from "@/lib/theme";

import { themeChoices } from "../choices";

export interface ThemeSwitchProps {
  /** What the switch is called for assistive technology, where no words are shown beside it. */
  label?: string;
  className?: string;
}

/**
 * The three themes side by side as icons, the one in force pressed in: a compact way to choose
 * inside a menu, where a second popover would be one too many. It is a radio group, so the arrow
 * keys move between the three and Tab moves past them.
 */
export function ThemeSwitch({ label = "Theme", className }: ThemeSwitchProps) {
  const preference = useThemePreference();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  function choose(value: ThemePreference, button: HTMLButtonElement | null) {
    const box = button?.getBoundingClientRect();
    setThemePreference(value, {
      x: box ? box.left + box.width / 2 : window.innerWidth / 2,
      y: box ? box.top + box.height / 2 : 0,
    });
  }

  function move(event: KeyboardEvent, index: number) {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (step === undefined) return;
    event.preventDefault();
    const next = (index + step + themeChoices.length) % themeChoices.length;
    const choice = themeChoices[next];
    const button = buttons.current[next] ?? null;
    if (!choice) return;
    button?.focus();
    choose(choice.value, button);
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("bg-muted flex gap-0.5 rounded-lg p-0.5", className)}
    >
      {themeChoices.map((choice, index) => {
        const active = choice.value === preference;
        return (
          <Tooltip key={choice.value} content={choice.label}>
            <button
              ref={(element) => {
                buttons.current[index] = element;
              }}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={choice.label}
              tabIndex={active ? 0 : -1}
              className={cn(
                "focus-visible:outline-ring grid h-8 w-10 place-items-center rounded-md transition-colors focus-visible:outline-2",
                active
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={(event) => {
                choose(choice.value, event.currentTarget);
              }}
              onKeyDown={(event) => {
                move(event, index);
              }}
            >
              <Icon
                name={choice.icon}
                weight={active ? "duotone" : "regular"}
                className={cn("size-4", active && "text-primary")}
              />
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}
