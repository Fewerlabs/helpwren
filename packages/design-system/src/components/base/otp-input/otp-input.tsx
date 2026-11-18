"use client";

import { useState, type ComponentProps } from "react";

import { cn } from "#lib/cn";

export interface OtpInputProps extends Omit<
  ComponentProps<"input">,
  "value" | "defaultValue" | "onChange" | "maxLength" | "type" | "size"
> {
  value: string;
  onValueChange: (value: string) => void;
  /** How many digits the code has. Default 6. */
  length?: number;
  /** Called once the last digit is in, for a form that submits itself. */
  onComplete?: ((value: string) => void) | undefined;
}

/**
 * A one-time code, a box for each digit. It is one real text field drawn as boxes, so pasting
 * a whole code, a phone's "code from Messages" suggestion and a screen reader all work as they
 * do for any field. Only digits are kept. Pair it with a label.
 */
export function OtpInput({
  value,
  onValueChange,
  length = 6,
  onComplete,
  className,
  disabled,
  onFocus,
  onBlur,
  "aria-invalid": invalid,
  ...props
}: OtpInputProps) {
  const [focused, setFocused] = useState(false);
  // The box the next digit goes into; the last one once the code is full.
  const active = Math.min(value.length, length - 1);

  return (
    <div
      data-slot="otp-input"
      className={cn("relative flex w-fit gap-2", disabled && "opacity-50", className)}
    >
      {Array.from({ length }, (_, index) => {
        const here = focused && index === active;
        return (
          <div
            key={index}
            aria-hidden="true"
            className={cn(
              "border-input bg-card grid h-12 w-10 place-items-center rounded-lg border font-mono text-lg font-medium transition-colors",
              here && "border-ring ring-ring/25 ring-3",
              invalid && "border-destructive",
            )}
          >
            {value[index] ??
              // A caret in the empty box that is waiting for a digit.
              (here ? <span className="bg-foreground h-5 w-px animate-pulse" /> : null)}
          </div>
        );
      })}
      <input
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        value={value}
        disabled={disabled}
        aria-invalid={invalid}
        // Over the boxes and see-through, so a tap anywhere on them focuses the one field.
        className="absolute inset-0 size-full cursor-text rounded-lg bg-transparent text-transparent caret-transparent outline-none selection:bg-transparent disabled:cursor-not-allowed"
        onChange={(event) => {
          // No `maxLength`: a pasted "482 913" must be read whole before its spaces are dropped.
          const digits = event.target.value.replace(/\D/g, "").slice(0, length);
          onValueChange(digits);
          if (digits.length === length && digits !== value) onComplete?.(digits);
        }}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        {...props}
      />
    </div>
  );
}
