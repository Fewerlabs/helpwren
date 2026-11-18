import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect } from "react";

import { Button } from "../button/button";
import { toast, Toaster } from "./toast";

const meta = {
  title: "Base/Toast",
  component: Toaster,
} satisfies Meta<typeof Toaster>;

export default meta;
type Story = StoryObj<typeof meta>;

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });

function Triggers() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="secondary"
        onClick={() => {
          toast.message("Link copied");
        }}
      >
        Message
      </Button>
      <Button
        variant="secondary"
        onClick={() => {
          toast.success("Conversation resolved", {
            description: "Priya was asked how it went.",
            action: {
              label: "Reopen",
              onClick: () => {
                toast.message("Conversation reopened");
              },
            },
          });
        }}
      >
        Success with an action
      </Button>
      <Button
        variant="secondary"
        onClick={() => {
          toast.error("The change could not be saved", { description: "Try again." });
        }}
      >
        Error
      </Button>
      <Button
        variant="secondary"
        onClick={() => {
          toast.promise(wait(1500), {
            loading: "Saving…",
            success: "Changes saved",
            error: "The changes could not be saved",
          });
        }}
      >
        Promise
      </Button>
      <Toaster />
    </div>
  );
}

export const Default: Story = { render: () => <Triggers /> };

/** One of each, kept on screen. */
function Kinds() {
  useEffect(() => {
    const options = { duration: Infinity };
    toast.message("Link copied", options);
    toast.error("The change could not be saved", { ...options, description: "Try again." });
    toast.success("Conversation resolved", {
      ...options,
      description: "Priya was asked how it went.",
      action: { label: "Reopen", onClick: () => undefined },
    });
    return () => {
      toast.dismiss();
    };
  }, []);
  return <Toaster expand />;
}

export const AllKinds: Story = { render: () => <Kinds /> };
export const Dark: Story = { render: () => <Kinds />, globals: { theme: "dark" } };
