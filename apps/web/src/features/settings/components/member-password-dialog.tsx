"use client";

import { type TeamMember } from "@helpwren/core";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FieldList,
  toast,
  type FieldItem,
} from "@helpwren/design-system";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { setPasswordFor } from "../actions";
import { memberPasswordSchema, type MemberPasswordValues } from "../schemas";

const fields: FieldItem<MemberPasswordValues>[] = [
  {
    name: "password",
    label: "New password",
    type: "password",
    required: true,
    hint: "At least 8 characters.",
    props: { autoComplete: "new-password" },
  },
];

const failures = {
  forbidden: "Only admins can set passwords.",
  self: "Change your own password under Profile.",
  not_found: "This person is no longer on the team.",
  invalid: "Check the password and try again.",
  failed: "The password could not be set. Try again.",
} as const;

export interface MemberPasswordDialogProps {
  /** Whose password is being set, or `null` while the dialog is closed. */
  member: TeamMember | null;
  onClose: () => void;
}

/** Sets a team member's password, for someone who has none or has forgotten theirs. */
export function MemberPasswordDialog({ member, onClose }: MemberPasswordDialogProps) {
  const form = useForm<MemberPasswordValues>({
    resolver: zodResolver(memberPasswordSchema),
    defaultValues: { password: "" },
  });

  function close() {
    form.reset();
    onClose();
  }

  async function save(values: MemberPasswordValues) {
    if (!member) return;
    try {
      const result = await setPasswordFor(member.id, values);
      if (result.ok) {
        toast.success(`Password set for ${member.name}`);
        close();
      } else {
        form.setError("root", { message: failures[result.reason] });
      }
    } catch {
      form.setError("root", { message: failures.failed });
    }
  }

  return (
    <Dialog
      open={member !== null}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set a password for {member?.name}</DialogTitle>
          <DialogDescription>
            It replaces any password they had. Let them know it, and they can change it under
            Profile.
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="grid gap-5"
          onSubmit={(event) => {
            void form.handleSubmit(save)(event);
          }}
        >
          <FieldList
            control={form.control}
            fields={fields}
            disabled={form.formState.isSubmitting}
          />
          {form.formState.errors.root ? (
            <p role="alert" className="text-destructive text-sm">
              {form.formState.errors.root.message}
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" loading={form.formState.isSubmitting}>
              Set password
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
