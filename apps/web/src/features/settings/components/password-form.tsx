"use client";

import { Button, FieldList, type FieldItem } from "@helpwren/design-system";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { saveOwnPassword } from "../actions";
import { ownPasswordSchema, type OwnPasswordValues } from "../schemas";
import { SettingsSection } from "./settings-frame";

const fields: FieldItem<OwnPasswordValues>[] = [
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

const failures = {
  forbidden: "Sign in again to change your password.",
  invalid: "Check the password and try again.",
  weak: "Choose a longer password.",
  same: "That is already your password.",
  failed: "The password could not be changed. Try again.",
} as const;

const empty: OwnPasswordValues = { password: "", confirm: "" };

/** Sets or changes the signed-in team member's own password. */
export function PasswordForm() {
  const [saved, setSaved] = useState(false);
  const form = useForm<OwnPasswordValues>({
    resolver: zodResolver(ownPasswordSchema),
    defaultValues: empty,
  });

  async function save(values: OwnPasswordValues) {
    setSaved(false);
    try {
      const result = await saveOwnPassword(values);
      if (result.ok) {
        form.reset(empty);
        setSaved(true);
      } else {
        form.setError("root", { message: failures[result.reason] });
      }
    } catch {
      form.setError("root", { message: failures.failed });
    }
  }

  return (
    <form
      noValidate
      onSubmit={(event) => {
        void form.handleSubmit(save)(event);
      }}
    >
      <SettingsSection title="Password" description="Sign in with your email and this password.">
        <div className="grid gap-4">
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
          {saved ? (
            <p role="status" className="text-sm">
              Password saved.
            </p>
          ) : null}
          <div>
            <Button type="submit" variant="secondary" loading={form.formState.isSubmitting}>
              Save password
            </Button>
          </div>
        </div>
      </SettingsSection>
    </form>
  );
}
