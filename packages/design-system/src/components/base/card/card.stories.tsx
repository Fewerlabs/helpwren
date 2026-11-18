import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "../button/button";
import { StatusChip } from "../status-chip/status-chip";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";

const meta = {
  title: "Base/Card",
  component: Card,
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

function Showcase() {
  return (
    <Card className="max-w-sm">
      <CardHeader>
        <CardTitle>Refund for order 1042</CardTitle>
        <CardDescription>Opened by Ada Lovelace, two hours ago</CardDescription>
        <CardAction>
          <StatusChip status="waiting" size="sm" />
        </CardAction>
      </CardHeader>
      <CardContent>
        <p>The customer was charged twice and is waiting for one payment to be returned.</p>
      </CardContent>
      <CardFooter className="gap-2">
        <Button size="sm">Reply</Button>
        <Button size="sm" variant="secondary">
          Assign
        </Button>
      </CardFooter>
    </Card>
  );
}

export const Default: Story = { render: () => <Showcase /> };
export const Dark: Story = { render: () => <Showcase />, globals: { theme: "dark" } };
