import type { Meta, StoryObj } from "@storybook/react-vite";

import { Label } from "../label/label";
import { Radio, RadioGroup } from "./radio-group";

const meta = {
  title: "Base/RadioGroup",
  component: RadioGroup,
} satisfies Meta<typeof RadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

const priorities = ["low", "normal", "high"] as const;

function Showcase({ disabled = false }: { disabled?: boolean }) {
  return (
    <RadioGroup defaultValue="normal" aria-label="Priority" disabled={disabled}>
      {priorities.map((priority) => (
        <div key={priority} className="flex items-center gap-3">
          <Radio id={`priority-${priority}-${disabled}`} value={priority} />
          <Label htmlFor={`priority-${priority}-${disabled}`} className="capitalize">
            {priority}
          </Label>
        </div>
      ))}
    </RadioGroup>
  );
}

export const Default: Story = { render: () => <Showcase /> };
export const Disabled: Story = { render: () => <Showcase disabled /> };
export const Dark: Story = { render: () => <Showcase />, globals: { theme: "dark" } };
