import type { Meta, StoryObj } from "@storybook/react-vite";

import { Link } from "./link";

const meta = {
  title: "Base/Link",
  component: Link,
  args: {
    href: "https://helpwren.fewerlabs.dev",
    children: "Read the install guide",
    external: false,
  },
} satisfies Meta<typeof Link>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const External: Story = { args: { external: true } };

function Showcase() {
  return (
    <p className="max-w-sm text-sm">
      Guest chat works as soon as the snippet is on your site. To recognise logged-in users,{" "}
      <Link href="https://helpwren.fewerlabs.dev">choose an identity option</Link> or read the{" "}
      <Link href="https://helpwren.fewerlabs.dev" external>
        security notes
      </Link>
      .
    </p>
  );
}

export const InText: Story = { render: () => <Showcase /> };
export const Dark: Story = { render: () => <Showcase />, globals: { theme: "dark" } };
