import type { Meta, StoryObj } from "@storybook/react-vite";

import { AppLoader } from "./app-loader";

const meta = {
  title: "Shared/AppLoader",
  component: AppLoader,
  args: { label: "Opening the article", size: "md", bird: true },
  argTypes: { size: { control: "inline-radio", options: ["sm", "md", "lg"] } },
  decorators: [
    (Story) => (
      <div className="border-rule bg-card h-72 max-w-xl rounded-xl border">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AppLoader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Small: Story = { args: { size: "sm", label: "Loading" } };
export const Large: Story = { args: { size: "lg" } };

/** On a screen that wears someone else's brand: a line of handwriting, and no wren. */
export const WithoutTheWren: Story = { args: { bird: false, label: "Loading articles" } };
export const Dark: Story = { globals: { theme: "dark" } };
