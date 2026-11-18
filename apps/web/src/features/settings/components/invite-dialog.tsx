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
  Icon,
  type FieldItem,
} from "@helpwren/design-system";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { inviteMember } from "../actions";
import { inviteSchema, type InviteValues } from "../schemas";

const fields: FieldItem<InviteValues>[] = [
  { name: "name", label: "Name", type: "input", required: true, props: { autoComplete: "off" } },
  {
    name: "email",
    label: "Work email",
    type: "input",
    required: true,
    props: { type: "email", autoComplete: "off", autoCapitalize: "none" },
  },
  {
    name: "role",
    label: "Role",
    type: "radio",
    props: {
      options: [
        { value: "agent", label: "Agent: reads and answers conversations" },
        { value: "admin", label: "Admin: also changes settings and the team" },
      ],
    },
  },
];

const empty: InviteValues = { name: "", email: "", role: "agent" };

const failures = {
  forbidden: "Only admins can add team members.",
  already_member: "This person is already on the team.",
  invalid: "Check the details and try again.",
  failed: "They could not be added. Try again.",
} as const;

/** The button that opens the form for adding someone to the team. */
export function InviteDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const form = useForm<InviteValues>({ resolver: zodResolver(inviteSchema), defaultValues: empty });

  function close() {
    setOpen(false);
    form.reset(empty);
  }

  async function invite(values: InviteValues) {
    try {
      const result = await inviteMember(values);
      if (result.ok) {
        close();
        router.refresh();
      } else if (result.reason === "already_member") {
        form.setError("email", { message: failures.already_member });
      } else {
        form.setError("root", { message: failures[result.reason] });
      }
    } catch {
      form.setError("root", { message: failures.failed });
    }
  }

  return (
    <>
      <Button
        size="sm"
        onClick={() => {
          setOpen(true);
        }}
      >
        <Icon name="plus" />
        Add team member
      </Button>
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
            <DialogTitle>Add a team member</DialogTitle>
            <DialogDescription>
              They can sign in straight away, with a code sent to this email. No invitation is
              emailed, so let them know.
            </DialogDescription>
          </DialogHeader>
          <form
            noValidate
            className="grid gap-5"
            onSubmit={(event) => {
              void form.handleSubmit(invite)(event);
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
                Add to team
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
