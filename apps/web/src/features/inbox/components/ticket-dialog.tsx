"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  Input,
} from "@helpwren/design-system";
import { useState } from "react";

export interface TicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the subject. Resolves when the conversation has become a ticket. */
  onConvert: (subject: string) => Promise<void>;
}

/** Asks what a ticket is about, then turns the conversation into one. */
export function TicketDialog({ open, onOpenChange, onConvert }: TicketDialogProps) {
  const [subject, setSubject] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "empty" | "failed">("idle");

  async function submit() {
    if (!subject.trim()) {
      setState("empty");
      return;
    }
    setState("saving");
    try {
      await onConvert(subject);
      setSubject("");
      setState("idle");
      onOpenChange(false);
    } catch {
      setState("failed");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convert to ticket</DialogTitle>
          <DialogDescription>
            The conversation gets a ticket number and stays in the same thread. It cannot be turned
            back into a chat.
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="grid gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <Field
            label="Subject"
            required
            {...(state === "empty" ? { error: "Say what the ticket is about." } : {})}
            {...(state === "failed"
              ? { error: "The ticket could not be created. Try again." }
              : {})}
          >
            <Input
              value={subject}
              maxLength={200}
              placeholder="Refund for a damaged order"
              onValueChange={(value) => {
                setSubject(value);
                setState("idle");
              }}
            />
          </Field>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => {
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={state === "saving"}>
              Convert to ticket
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
