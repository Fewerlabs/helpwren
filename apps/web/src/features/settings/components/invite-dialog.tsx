"use client";

import {
  ActionButton,
  Button,
  ChoiceCards,
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
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { inviteMember } from "../actions";
import { inviteSchema, type InviteMethod, type InviteValues } from "../schemas";
import type { InviteDelivery, InviteFailure } from "../server/invites";
import { InviteHandoff } from "./invite-handoff";

const submitLabels: Record<InviteMethod, string> = {
  email: "Send invite",
  link: "Create link",
  password: "Create password",
};

function inviteFields(emailReady: boolean, disabled: boolean): FieldItem<InviteValues>[] {
  return [
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
    {
      name: "method",
      label: "How they join",
      type: "custom",
      render: ({ field }) => (
        <ChoiceCards
          label="How they join"
          value={field.value}
          onValueChange={field.onChange}
          disabled={disabled}
          options={[
            {
              value: "email",
              label: "Email an invite",
              description: emailReady ? "A link to set a password" : "Set up email first",
              disabled: !emailReady,
            },
            { value: "link", label: "Copy a link", description: "You send them the link" },
            {
              value: "password",
              label: "Temporary password",
              description: "They change it at sign-in",
            },
          ]}
        />
      ),
    },
  ];
}

const failures: Record<InviteFailure | "invalid" | "failed", string> = {
  forbidden: "Only admins can add team members.",
  already_member: "This person is already on the team.",
  self: "You are already on the team.",
  not_found: "This person is no longer on the team.",
  email_unavailable: "Email is not set up. Copy a link instead.",
  rate_limited: "You have sent many invites. Wait an hour, or copy a link instead.",
  invalid: "Check the details and try again.",
  failed: "They could not be added. Try again.",
};

export interface InviteDialogProps {
  /** Whether the install can send email, which an emailed invite needs. */
  emailReady: boolean;
}

/** The button that opens the form for adding someone to the team. */
export function InviteDialog({ emailReady }: InviteDialogProps) {
  const router = useRouter();
  const empty: InviteValues = {
    name: "",
    email: "",
    role: "agent",
    method: emailReady ? "email" : "link",
  };
  const [open, setOpen] = useState(false);
  // Once they are added, the link or password to pass on, shown in place of the form.
  const [handoff, setHandoff] = useState<{
    name: string;
    delivery: Extract<InviteDelivery, { kind: "link" | "password" }>;
  } | null>(null);
  const form = useForm<InviteValues>({ resolver: zodResolver(inviteSchema), defaultValues: empty });
  const method = useWatch({ control: form.control, name: "method" });

  function close() {
    setOpen(false);
    setHandoff(null);
    form.reset(empty);
  }

  async function invite(values: InviteValues) {
    try {
      const result = await inviteMember(values);
      if (!result.ok) {
        if (result.reason === "already_member") {
          form.setError("email", { message: failures.already_member });
        } else {
          form.setError("root", { message: failures[result.reason] });
        }
        return;
      }
      router.refresh();
      if (result.delivery.kind === "emailed") {
        toast.success(`Invite sent to ${values.email}`);
        close();
      } else {
        setHandoff({ name: values.name, delivery: result.delivery });
      }
    } catch {
      form.setError("root", { message: failures.failed });
    }
  }

  return (
    <>
      <ActionButton
        icon="user-plus"
        label="Invite"
        onClick={() => {
          setOpen(true);
        }}
      />
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
          {handoff ? (
            <InviteHandoff name={handoff.name} delivery={handoff.delivery} onDone={close} />
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Invite a team member</DialogTitle>
                <DialogDescription>They can sign in as soon as they join.</DialogDescription>
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
                  fields={inviteFields(emailReady, form.formState.isSubmitting)}
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
                    {submitLabels[method]}
                  </Button>
                </DialogFooter>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
