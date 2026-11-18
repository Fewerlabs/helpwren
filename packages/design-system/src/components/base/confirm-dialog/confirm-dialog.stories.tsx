import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Button } from "../button/button";
import { Checkbox } from "../checkbox/checkbox";
import { Label } from "../label/label";
import { ConfirmDialog } from "./confirm-dialog";
import { ConfirmProvider, useConfirm } from "./use-confirm";

const meta = {
  title: "Base/ConfirmDialog",
  component: ConfirmDialog,
} satisfies Meta<typeof ConfirmDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });

const resolve = {
  title: "Resolve this conversation?",
  description: "Priya is told it was resolved and asked how it went. You can reopen it later.",
  confirmLabel: "Resolve",
  icon: "check-circle",
} as const;

const remove = {
  tone: "destructive",
  title: "Delete this conversation?",
  description: "The messages and attachments are removed for everyone. This cannot be undone.",
  confirmLabel: "Delete",
  cancelLabel: "Keep it",
  icon: "trash",
} as const;

export const Default: Story = {
  args: { ...resolve, trigger: <Button variant="secondary">Resolve</Button> },
};

export const Open: Story = { args: { ...resolve, defaultOpen: true } };

export const Destructive: Story = { args: { ...remove, defaultOpen: true } };

export const WithoutIcon: Story = {
  args: { title: "Discard your reply?", confirmLabel: "Discard", defaultOpen: true },
};

/** The button spins until the promise settles. This one fails, to show the error line. */
export const AsyncFailure: Story = {
  args: {
    ...remove,
    defaultOpen: true,
    onConfirm: async () => {
      await wait(1200);
      throw new Error("The conversation could not be deleted. Try again.");
    },
  },
};

function WithCheckbox() {
  const [understood, setUnderstood] = useState(false);
  return (
    <ConfirmDialog {...remove} defaultOpen confirmDisabled={!understood}>
      <div className="flex items-center gap-2">
        <Checkbox
          id="understood"
          checked={understood}
          onCheckedChange={(checked) => {
            setUnderstood(checked === true);
          }}
        />
        <Label htmlFor="understood">I understand this cannot be undone</Label>
      </div>
    </ConfirmDialog>
  );
}

/** `children` holds anything more to ask; `confirmDisabled` waits for it. */
export const ExtraContent: Story = { args: remove, render: () => <WithCheckbox /> };

function Asker() {
  const confirm = useConfirm();
  const [answer, setAnswer] = useState("Not asked yet");
  return (
    <div className="flex items-center gap-3">
      <Button
        variant="secondary"
        onClick={() => {
          void confirm(resolve).then((confirmed) => {
            setAnswer(confirmed ? "Confirmed" : "Cancelled");
          });
        }}
      >
        Resolve
      </Button>
      <p role="status">{answer}</p>
    </div>
  );
}

/** From code: `if (await confirm({ title })) { ... }`, with a `ConfirmProvider` above. */
export const FromCode: Story = {
  args: resolve,
  render: () => (
    <ConfirmProvider>
      <Asker />
    </ConfirmProvider>
  ),
};

export const Dark: Story = { args: { ...remove, defaultOpen: true }, globals: { theme: "dark" } };
