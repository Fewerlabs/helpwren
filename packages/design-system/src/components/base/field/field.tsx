"use client";

import { Slot } from "radix-ui";
import { useId, type ComponentProps, type ReactElement, type ReactNode } from "react";

import { Field as UiField, FieldLabel as UiFieldLabel } from "#components/ui/field";
import { cn } from "#lib/cn";

import { FieldError, FieldHint } from "./field-message";

export interface FieldProps extends Omit<ComponentProps<"div">, "children"> {
  /** The visible name of the control. */
  label: ReactNode;
  /** Help shown under the control and read out with it. */
  hint?: ReactNode;
  /** An error message. When set, the control is marked invalid and the message is announced. */
  error?: ReactNode;
  /** Marks the control as required, visually and for assistive technology. */
  required?: boolean;
  /**
   * Exactly one control element, such as an `Input`, `Textarea`, `TagsInput`, `Combobox`
   * or `SelectTrigger`. For a `Select`, put the `Field` inside it, around the trigger.
   */
  children: ReactElement;
}

/**
 * A control with its label, hint and error. It connects them for you: the label
 * points at the control, and the hint and error describe it.
 */
export function Field({
  label,
  hint,
  error,
  required = false,
  id: idProp,
  className,
  children,
  ...props
}: FieldProps) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const hasError = error !== undefined && error !== null && error !== false && error !== "";
  // An error takes the hint's place, so the field never shows two lines of small text.
  const hasHint = !hasError && hint !== undefined && hint !== null && hint !== false;
  const hintId = hasHint ? `${id}-hint` : undefined;
  const errorId = hasError ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ");

  return (
    <UiField data-invalid={hasError || undefined} className={cn("gap-1.5", className)} {...props}>
      <UiFieldLabel htmlFor={id} className="text-foreground text-sm font-medium">
        {label}
        {required ? (
          <span aria-hidden="true" className="text-destructive">
            *
          </span>
        ) : null}
      </UiFieldLabel>
      <Slot.Root
        id={id}
        aria-describedby={describedBy || undefined}
        aria-invalid={hasError || undefined}
        aria-required={required || undefined}
      >
        {children}
      </Slot.Root>
      {hasHint ? <FieldHint id={hintId}>{hint}</FieldHint> : null}
      {hasError ? <FieldError id={errorId}>{error}</FieldError> : null}
    </UiField>
  );
}
