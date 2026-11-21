"use client";

import { Button, FieldList, type FieldItem } from "@helpwren/design-system";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { passwordTwiceSchema, type PasswordTwiceValues } from "./password-schema";

const fields: FieldItem<PasswordTwiceValues>[] = [
  {
    name: "password",
    label: "New password",
    type: "password",
    required: true,
    hint: "At least 8 characters.",
    props: { autoComplete: "new-password" },
  },
  {
    name: "confirm",
    label: "Type it again",
    type: "password",
    required: true,
    props: { autoComplete: "new-password" },
  },
];

const empty: PasswordTwiceValues = { password: "", confirm: "" };

const FAILED = "The password could not be saved. Try again.";

export interface NewPasswordFormProps {
  /** Saves the password, and returns what went wrong for the person to read, or `null`. */
  save: (values: PasswordTwiceValues) => Promise<string | null>;
  submitLabel: string;
  submitVariant?: "primary" | "secondary";
  /** Said once it is saved, when the person stays on the page. */
  savedMessage?: string;
}

/**
 * Someone choosing their own password, typed twice: in their profile, at their first sign-in
 * and when they accept an invite. The same rules apply in all three.
 */
export function NewPasswordForm({
  save,
  submitLabel,
  submitVariant = "primary",
  savedMessage,
}: NewPasswordFormProps) {
  const [saved, setSaved] = useState(false);
  const form = useForm<PasswordTwiceValues>({
    resolver: zodResolver(passwordTwiceSchema),
    defaultValues: empty,
  });

  async function submit(values: PasswordTwiceValues) {
    setSaved(false);
    let problem: string | null;
    try {
      problem = await save(values);
    } catch {
      problem = FAILED;
    }
    if (problem === null) {
      form.reset(empty);
      setSaved(true);
    } else {
      form.setError("root", { message: problem });
    }
  }

  return (
    <form
      noValidate
      className="grid gap-4"
      onSubmit={(event) => {
        void form.handleSubmit(submit)(event);
      }}
    >
      <FieldList control={form.control} fields={fields} disabled={form.formState.isSubmitting} />
      {form.formState.errors.root ? (
        <p role="alert" className="text-destructive text-sm">
          {form.formState.errors.root.message}
        </p>
      ) : null}
      {saved && savedMessage ? (
        <p role="status" className="text-sm">
          {savedMessage}
        </p>
      ) : null}
      <div>
        <Button type="submit" variant={submitVariant} loading={form.formState.isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
