"use client";

import { useRef, useState } from "react";

import { cn } from "#lib/cn";
import { setThemePreference, useTheme, useThemePreference, type ThemePreference } from "#lib/theme";

import { Icon } from "../../base/icon/icon";
import { Popover, PopoverContent, PopoverTrigger } from "../../base/popover/popover";
import { themeChoices as choices } from "./choices";

export interface ThemeMenuProps {
  /** Classes for the button, which shows the choice that is in force. */
  className?: string;
  /** Where the menu opens from the button. */
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
}

/**
 * The theme: light, dark, or whatever the device prefers. The button shows the choice in force
 * and opens the three; a change of theme spreads out from the button.
 */
export function ThemeMenu({ className, side = "bottom", align = "end" }: ThemeMenuProps) {
  const preference = useThemePreference();
  // The button shows the theme on screen, a sun or a moon, which reads as a theme button at a
  // glance; a monitor for System did not. The menu says which choice is in force.
  const onScreen = useTheme();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const shown = choices.find((choice) => choice.value === preference) ?? choices[2];

  function choose(value: ThemePreference) {
    setOpen(false);
    const box = trigger.current?.getBoundingClientRect();
    setThemePreference(value, {
      x: box ? box.left + box.width / 2 : window.innerWidth / 2,
      y: box ? box.top + box.height / 2 : 0,
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          ref={trigger}
          type="button"
          aria-label={`Theme: ${shown?.label ?? "System"}`}
          title="Theme"
          className={cn(
            "focus-visible:outline-ring grid place-items-center transition-colors focus-visible:outline-2",
            className,
          )}
        >
          <Icon name={onScreen === "dark" ? "moon" : "sun"} className="size-[1.125rem]" />
        </button>
      </PopoverTrigger>
      <PopoverContent side={side} align={align} className="w-40 p-1" aria-label="Theme">
        <div role="radiogroup" aria-label="Theme" className="grid">
          {choices.map((choice) => {
            const active = choice.value === preference;
            return (
              <button
                key={choice.value}
                type="button"
                role="radio"
                aria-checked={active}
                className="hover:bg-muted focus-visible:outline-ring flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors focus-visible:outline-2"
                onClick={() => {
                  choose(choice.value);
                }}
              >
                <Icon name={choice.icon} className="text-muted-foreground size-4" />
                <span className="flex-1 text-left">{choice.label}</span>
                {active ? <Icon name="check" className="size-4" /> : null}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
