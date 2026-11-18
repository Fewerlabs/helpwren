"use client";

import { useState, type KeyboardEvent, type PointerEvent } from "react";

import { cn } from "#lib/cn";

import { Icon } from "../icon/icon";
import { Input } from "../input/input";
import { Popover, PopoverContent, PopoverTrigger } from "../popover/popover";
import { focusRing } from "../styles";
import { hexToHsv, hsvToHex, isHex, type Hsv } from "./color";

/** One colour, or two that fade into each other. Colours are `#rrggbb`. */
export interface ColorValue {
  color: string;
  /** The colour a gradient ends on. Leave out for a solid colour. */
  to?: string | undefined;
}

export interface ColorSwatch extends ColorValue {
  /** Names the swatch for assistive technology and its tooltip, such as "Ocean". */
  label: string;
}

export interface ColorPickerProps {
  /** Names the group for assistive technology, such as "Brand colour". */
  label: string;
  value: ColorValue;
  onValueChange: (value: ColorValue) => void;
  /** The colours offered. The last circle after them opens a picker for any other colour. */
  swatches: readonly ColorSwatch[];
  /** The name of the circle that opens the picker. */
  customLabel?: string;
  disabled?: boolean;
  className?: string;
}

/** How a value is painted: flat, or fading from its first colour to its second. */
export function colorBackground({ color, to }: ColorValue): string {
  return to ? `linear-gradient(135deg, ${color}, ${to})` : color;
}

const same = (first: ColorValue, second: ColorValue) =>
  first.color.toLowerCase() === second.color.toLowerCase() &&
  (first.to ?? "").toLowerCase() === (second.to ?? "").toLowerCase();

const circle =
  "relative grid size-8 shrink-0 place-items-center rounded-full transition-transform hover:scale-105 disabled:pointer-events-none disabled:opacity-50";
const chosenRing = "ring-foreground/70 ring-offset-card ring-2 ring-offset-2";

const clamp = (value: number) => Math.min(1, Math.max(0, value));

interface SpectrumProps {
  hsv: Hsv;
  onChange: (hsv: Hsv) => void;
}

/** The square to pick saturation and brightness from, and the strip under it for hue. */
function Spectrum({ hsv, onChange }: SpectrumProps) {
  function pick(event: PointerEvent<HTMLDivElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    onChange({
      ...hsv,
      s: clamp((event.clientX - box.left) / box.width),
      v: clamp(1 - (event.clientY - box.top) / box.height),
    });
  }

  function nudge(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? 0.1 : 0.02;
    const moves: Record<string, Partial<Hsv>> = {
      ArrowLeft: { s: clamp(hsv.s - step) },
      ArrowRight: { s: clamp(hsv.s + step) },
      ArrowUp: { v: clamp(hsv.v + step) },
      ArrowDown: { v: clamp(hsv.v - step) },
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    onChange({ ...hsv, ...move });
  }

  return (
    <>
      <div
        role="slider"
        tabIndex={0}
        aria-label="Saturation and brightness"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(hsv.s * 100)}
        aria-valuetext={`Saturation ${Math.round(hsv.s * 100)}%, brightness ${Math.round(hsv.v * 100)}%`}
        className={cn("relative h-36 cursor-crosshair touch-none rounded-lg", focusRing)}
        style={{
          backgroundColor: `hsl(${hsv.h} 100% 50%)`,
          backgroundImage:
            "linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)",
        }}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          pick(event);
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) pick(event);
        }}
        onKeyDown={nudge}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgb(0_0_0/0.35)]"
          style={{
            left: `${hsv.s * 100}%`,
            top: `${(1 - hsv.v) * 100}%`,
            backgroundColor: hsvToHex(hsv),
          }}
        />
      </div>
      <input
        type="range"
        aria-label="Hue"
        min={0}
        max={359}
        value={Math.round(hsv.h)}
        className={cn(
          "h-3 w-full cursor-pointer appearance-none rounded-full",
          "[&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-transparent [&::-webkit-slider-thumb]:shadow-[0_0_0_1px_rgb(0_0_0/0.35)]",
          "[&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-transparent",
          focusRing,
        )}
        style={{
          backgroundImage: "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
        }}
        onChange={(event) => {
          onChange({ ...hsv, h: Number(event.target.value) });
        }}
      />
    </>
  );
}

/**
 * Chooses a colour from a set of swatches, some of them gradients, or any other colour from a
 * picker that the last circle opens. For a brand or theme colour. The value is always a real
 * colour, so there is nothing to validate.
 */
export function ColorPicker({
  label,
  value,
  onValueChange,
  swatches,
  customLabel = "Custom colour",
  disabled = false,
  className,
}: ColorPickerProps) {
  const custom = !swatches.some((swatch) => same(swatch, value));
  // Kept apart from the value, so the hue survives a trip through grey, where it means nothing.
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(value.color));
  const [hex, setHex] = useState(value.color);

  function choose(next: Hsv) {
    setHsv(next);
    const color = hsvToHex(next);
    setHex(color);
    onValueChange({ color });
  }

  return (
    <div role="group" aria-label={label} className={cn("flex flex-wrap gap-3", className)}>
      {swatches.map((swatch) => {
        const chosen = same(swatch, value);
        return (
          <button
            key={swatch.label}
            type="button"
            title={swatch.label}
            aria-label={swatch.label}
            aria-pressed={chosen}
            disabled={disabled}
            className={cn(circle, focusRing, chosen && chosenRing)}
            style={{ background: colorBackground(swatch) }}
            onClick={() => {
              onValueChange(
                swatch.to ? { color: swatch.color, to: swatch.to } : { color: swatch.color },
              );
            }}
          />
        );
      })}
      <Popover
        onOpenChange={(open) => {
          if (open) {
            setHsv(hexToHsv(value.color));
            setHex(value.color);
          }
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            title={customLabel}
            aria-label={customLabel}
            aria-pressed={custom}
            disabled={disabled}
            className={cn(
              circle,
              focusRing,
              custom ? chosenRing : "border-input text-muted-foreground border border-dashed",
            )}
            style={custom ? { background: colorBackground(value) } : undefined}
          >
            <Icon
              name="plus"
              className={cn("size-4", custom && "text-white mix-blend-difference")}
            />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="grid w-60 gap-3 p-3">
          <Spectrum hsv={hsv} onChange={choose} />
          <Input
            aria-label="Hex colour"
            className="font-mono"
            maxLength={7}
            value={hex}
            aria-invalid={!isHex(hex)}
            onChange={(event) => {
              const typed = event.target.value.trim();
              setHex(typed);
              // Only a whole colour is passed on; a half-typed one stays in the box.
              if (isHex(typed)) {
                setHsv(hexToHsv(typed));
                onValueChange({ color: typed.toLowerCase() });
              }
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
