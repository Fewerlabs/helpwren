import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "../button/button";
import { Field } from "../field/field";
import { Input } from "../input/input";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

const meta = {
  title: "Base/Popover",
  component: Popover,
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

function Showcase({ defaultOpen = false }: { defaultOpen?: boolean }) {
  return (
    <Popover defaultOpen={defaultOpen}>
      <PopoverTrigger asChild>
        <Button variant="secondary">Snooze</Button>
      </PopoverTrigger>
      <PopoverContent align="start" aria-label="Snooze this conversation">
        <Field label="Remind me in (hours)">
          <Input type="number" defaultValue={4} min={1} />
        </Field>
        <Button size="sm">Snooze</Button>
      </PopoverContent>
    </Popover>
  );
}

export const Default: Story = { render: () => <Showcase /> };
export const Open: Story = { render: () => <Showcase defaultOpen /> };
export const Dark: Story = { render: () => <Showcase defaultOpen />, globals: { theme: "dark" } };
