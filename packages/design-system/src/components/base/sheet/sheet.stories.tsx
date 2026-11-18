import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "../button/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./sheet";

const meta = {
  title: "Base/Sheet",
  component: Sheet,
} satisfies Meta<typeof Sheet>;

export default meta;
type Story = StoryObj<typeof meta>;

function Showcase({ defaultOpen = false }: { defaultOpen?: boolean }) {
  return (
    <Sheet defaultOpen={defaultOpen}>
      <SheetTrigger asChild>
        <Button variant="secondary">Contact details</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Ada Lovelace</SheetTitle>
          <SheetDescription>Customer since March. Three past conversations.</SheetDescription>
        </SheetHeader>
        <p className="px-4 text-sm">ada@example.com</p>
      </SheetContent>
    </Sheet>
  );
}

export const Default: Story = { render: () => <Showcase /> };
export const Open: Story = { render: () => <Showcase defaultOpen /> };
export const Dark: Story = { render: () => <Showcase defaultOpen />, globals: { theme: "dark" } };
