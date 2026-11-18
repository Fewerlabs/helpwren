import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { ChoiceCards } from "./choice-cards";

const meta: Meta = { title: "Base/ChoiceCards" };
export default meta;
type Story = StoryObj;

const corner = (side: "left" | "right") => (
  <span className="border-rule bg-card relative block h-11 w-16 rounded-md border">
    <span
      className={`bg-primary absolute bottom-1 size-2.5 rounded-full ${side === "left" ? "left-1" : "right-1"}`}
    />
  </span>
);

const options = [
  { value: "right", label: "Bottom right", visual: corner("right") },
  { value: "left", label: "Bottom left", visual: corner("left") },
  { value: "none", label: "Hidden", description: "Not available yet", disabled: true },
] as const;

function Example() {
  const [value, setValue] = useState<(typeof options)[number]["value"]>("right");
  return (
    <div className="w-96">
      <ChoiceCards
        label="Launcher position"
        value={value}
        options={options}
        onValueChange={setValue}
      />
    </div>
  );
}

/** Each choice is a card with a small picture of what it does. */
export const WithVisuals: Story = { render: () => <Example /> };
