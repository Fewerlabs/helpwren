import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "../button/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";

const meta = {
  title: "Base/Dialog",
  component: Dialog,
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

function Showcase({ defaultOpen = false }: { defaultOpen?: boolean }) {
  return (
    <Dialog defaultOpen={defaultOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">Delete conversation</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this conversation?</DialogTitle>
          <DialogDescription>
            The messages and attachments are removed for everyone. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Keep it</Button>
          </DialogClose>
          <Button variant="destructive">Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const Default: Story = { render: () => <Showcase /> };
export const Open: Story = { render: () => <Showcase defaultOpen /> };
/** `fullScreen` gives the dialog the whole screen, for something that needs the room. */
export const FullScreen: Story = {
  render: () => (
    <Dialog defaultOpen>
      <DialogTrigger asChild>
        <Button variant="secondary">Preview</Button>
      </DialogTrigger>
      <DialogContent fullScreen>
        <DialogHeader>
          <DialogTitle>Preview</DialogTitle>
          <DialogDescription>The widget as a visitor sees it.</DialogDescription>
        </DialogHeader>
        <div className="border-rule bg-canvas min-h-0 flex-1 rounded-2xl border" />
      </DialogContent>
    </Dialog>
  ),
};

export const Dark: Story = { render: () => <Showcase defaultOpen />, globals: { theme: "dark" } };
