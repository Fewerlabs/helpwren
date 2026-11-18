"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FieldList,
  type FieldItem,
} from "@helpwren/design-system";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { ShortcutTakenError } from "../api/canned-replies";
import { useCreateCannedReply } from "../hooks/use-canned-replies";
import { newCannedReplySchema, type NewCannedReply } from "../schemas/canned-reply";
import { useComposerOpen, useSetComposerOpen } from "../store/example-store";

const fields: FieldItem<NewCannedReply>[] = [
  { name: "title", label: "Title", type: "input", required: true },
  {
    name: "shortcut",
    label: "Shortcut",
    type: "input",
    required: true,
    hint: "Type this after a slash to insert the reply.",
    props: { prepend: "/", autoCapitalize: "none", spellCheck: false },
  },
  { name: "body", label: "Reply", type: "textarea", required: true },
];

const empty: NewCannedReply = { title: "", shortcut: "", body: "" };

/** The dialog for writing a new canned reply. */
export function CannedReplyForm() {
  const open = useComposerOpen();
  const setOpen = useSetComposerOpen();
  const create = useCreateCannedReply();
  const form = useForm<NewCannedReply>({
    resolver: zodResolver(newCannedReplySchema),
    defaultValues: empty,
  });

  function close() {
    setOpen(false);
    form.reset(empty);
  }

  async function save(values: NewCannedReply) {
    try {
      await create.mutateAsync(values);
      close();
    } catch (error) {
      // A shortcut that is taken belongs on its field; anything else is a general failure.
      if (error instanceof ShortcutTakenError) {
        form.setError("shortcut", { message: error.message });
      } else {
        form.setError("root", { message: "The reply could not be saved. Try again." });
      }
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setOpen(true);
        } else {
          close();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New canned reply</DialogTitle>
          <DialogDescription>Save a reply you send often.</DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="grid gap-5"
          onSubmit={(event) => {
            void form.handleSubmit(save)(event);
          }}
        >
          <FieldList control={form.control} fields={fields} disabled={create.isPending} />
          {form.formState.errors.root ? (
            <p role="alert" className="text-destructive text-sm">
              {form.formState.errors.root.message}
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" loading={create.isPending}>
              Save reply
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
