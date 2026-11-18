"use client";

import type { ComponentProps } from "react";

import { cn } from "#lib/cn";

import { focusRing } from "../styles";

export interface SliderProps extends Omit<
  ComponentProps<"input">,
  "type" | "value" | "defaultValue" | "onChange" | "min" | "max" | "step"
> {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Turns the value into what is shown beside the track and read out, such as `"20px"`. */
  formatValue?: (value: number) => string;
}

/**
 * Picks a number from a range by dragging, with the value shown beside the track. For amounts
 * where the feel matters more than the figure, such as spacing or size. Pair it with a label.
 */
export function Slider({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  formatValue = String,
  className,
  disabled,
  ...props
}: SliderProps) {
  const filled = max === min ? 0 : ((value - min) / (max - min)) * 100;

  return (
    <div data-slot="slider" className={cn("flex items-center gap-3", className)}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-valuetext={formatValue(value)}
        className={cn(
          "h-1.5 min-w-0 flex-1 cursor-pointer appearance-none rounded-full disabled:cursor-not-allowed disabled:opacity-50",
          "[&::-webkit-slider-thumb]:bg-card [&::-webkit-slider-thumb]:border-primary [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2",
          "[&::-moz-range-thumb]:bg-card [&::-moz-range-thumb]:border-primary [&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2",
          focusRing,
        )}
        // The part of the track before the thumb is filled, so the amount reads at a glance.
        style={{
          background: `linear-gradient(to right, var(--primary) ${filled}%, var(--muted) ${filled}%)`,
        }}
        onChange={(event) => {
          onValueChange(Number(event.target.value));
        }}
        {...props}
      />
      <output className="text-muted-foreground w-12 shrink-0 text-right text-xs tabular-nums">
        {formatValue(value)}
      </output>
    </div>
  );
}
