"use client";

import { useId, type ReactNode } from "react";

import { cn } from "#lib/cn";

export interface ChoiceCard<Value extends string = string> {
  value: Value;
  label: string;
  /** A small picture of the choice, shown above its label. */
  visual?: ReactNode;
  /** A line under the label, such as why the choice cannot be made yet. */
  description?: ReactNode;
  disabled?: boolean;
}

export interface ChoiceCardsProps<Value extends string = string> {
  /** Names the group for assistive technology, such as "Launcher position". */
  label: string;
  value: Value;
  onValueChange: (value: Value) => void;
  options: readonly ChoiceCard<Value>[];
  disabled?: boolean;
  className?: string;
}

/**
 * Chooses one of a few options that are easier to recognise by sight than by name: each is a
 * card with a small picture. For two to four choices. Underneath it is a group of radio
 * buttons, so the arrow keys move between the cards.
 */
export function ChoiceCards<Value extends string = string>({
  label,
  value,
  onValueChange,
  options,
  disabled = false,
  className,
}: ChoiceCardsProps<Value>) {
  const name = useId();

  return (
    <div
      role="radiogroup"
      aria-label={label}
      data-slot="choice-cards"
      className={cn("grid grid-cols-[repeat(auto-fit,minmax(7.5rem,1fr))] gap-2.5", className)}
    >
      {options.map((option) => {
        const off = disabled || option.disabled === true;
        return (
          <label
            key={option.value}
            className={cn(
              "border-input bg-card relative grid cursor-pointer content-start gap-2 rounded-xl border p-2.5 transition-colors",
              "has-[:checked]:border-primary has-[:checked]:ring-primary has-[:checked]:ring-1",
              "has-[:focus-visible]:outline-ring has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2",
              off ? "cursor-not-allowed opacity-55" : "hover:bg-muted/40",
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={option.value === value}
              disabled={off}
              className="sr-only"
              onChange={() => {
                onValueChange(option.value);
              }}
            />
            {option.visual ? (
              <span
                aria-hidden="true"
                className="bg-muted/60 grid h-16 place-items-center overflow-hidden rounded-lg"
              >
                {option.visual}
              </span>
            ) : null}
            <span className="grid gap-0.5 px-0.5">
              <span className="text-sm font-medium">{option.label}</span>
              {option.description ? (
                <span className="text-muted-foreground text-xs">{option.description}</span>
              ) : null}
            </span>
          </label>
        );
      })}
    </div>
  );
}
