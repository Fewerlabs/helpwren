import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Slider } from "./slider";

const meta: Meta = { title: "Base/Slider" };
export default meta;
type Story = StoryObj;

function Example({ disabled = false }: { disabled?: boolean }) {
  const [value, setValue] = useState(20);
  return (
    <div className="w-72">
      <Slider
        aria-label="Space from the side"
        value={value}
        max={80}
        step={4}
        disabled={disabled}
        formatValue={(amount) => `${amount}px`}
        onValueChange={setValue}
      />
    </div>
  );
}

/** Drag, or use the arrow keys. The value shows beside the track. */
export const Default: Story = { render: () => <Example /> };

export const Disabled: Story = { render: () => <Example disabled /> };
