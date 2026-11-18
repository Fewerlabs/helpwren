import type { Meta, StoryObj } from "@storybook/react-vite";

import { Avatar } from "./avatar";

const picture =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" fill="#3d6b57"/><circle cx="24" cy="19" r="8" fill="#f7f4ed"/><path d="M8 46c2-12 30-12 32 0z" fill="#f7f4ed"/></svg>',
  );

const meta = {
  title: "Base/Avatar",
  component: Avatar,
  args: { name: "Ada Lovelace", size: "md" },
  argTypes: { size: { control: "inline-radio", options: ["sm", "md", "lg"] } },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

function Showcase() {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <Avatar name="Ada Lovelace" size="sm" />
      <Avatar name="Grace Hopper" />
      <Avatar name="Glown" size="lg" />
      <Avatar name="Ada Lovelace" src={picture} size="lg" />
    </div>
  );
}

export const Overview: Story = { render: () => <Showcase /> };
export const Dark: Story = { render: () => <Showcase />, globals: { theme: "dark" } };
