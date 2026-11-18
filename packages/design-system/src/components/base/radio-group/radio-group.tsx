import type { ComponentProps } from "react";

import {
  RadioGroup as UiRadioGroup,
  RadioGroupItem as UiRadioGroupItem,
} from "#components/ui/radio-group";
import { cn } from "#lib/cn";

import { controlInvalid, controlSurface, focusRing } from "../styles";

export type RadioGroupProps = ComponentProps<typeof UiRadioGroup>;
export type RadioProps = ComponentProps<typeof UiRadioGroupItem>;

/** Groups `Radio` items so that exactly one can be chosen. Give the group a label. */
export function RadioGroup({ className, ...props }: RadioGroupProps) {
  return <UiRadioGroup className={cn("gap-3", className)} {...props} />;
}

/** One option inside a `RadioGroup`. Always pair it with a label. */
export function Radio({ className, ...props }: RadioProps) {
  return (
    <UiRadioGroupItem
      className={cn(
        "size-5 items-center justify-center after:-inset-3",
        controlSurface,
        focusRing,
        controlInvalid,
        className,
      )}
      {...props}
    />
  );
}
