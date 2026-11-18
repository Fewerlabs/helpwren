import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { ColorPicker, colorBackground, type ColorValue } from "./color-picker";

const meta: Meta = { title: "Base/ColorPicker" };
export default meta;
type Story = StoryObj;

const swatches = [
  { label: "Moss", color: "#3d6b57" },
  { label: "Blue", color: "#1d4ed8" },
  { label: "Ink", color: "#26231e" },
  { label: "Lagoon", color: "#0f766e", to: "#38bdf8" },
  { label: "Dusk", color: "#4c1d95", to: "#be185d" },
  { label: "Ember", color: "#c2410c", to: "#f59e0b" },
];

function Example({ disabled = false }: { disabled?: boolean }) {
  const [value, setValue] = useState<ColorValue>({ color: "#3d6b57" });
  return (
    <div className="grid gap-4">
      <ColorPicker
        label="Brand colour"
        swatches={swatches}
        value={value}
        onValueChange={setValue}
        disabled={disabled}
      />
      <div
        className="h-12 w-56 rounded-xl"
        role="img"
        aria-label={`Chosen: ${value.color}${value.to ? ` to ${value.to}` : ""}`}
        style={{ background: colorBackground(value) }}
      />
    </div>
  );
}

/** Solid colours and gradients to choose from. The last circle opens a picker for any colour. */
export const Swatches: Story = { render: () => <Example /> };

export const Disabled: Story = { render: () => <Example disabled /> };
