"use client";

import { Button, FieldList, Link, type FieldItem } from "@helpwren/design-system";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { createAdmin } from "../actions";
import { firstAdminSchema, type FirstAdminValues } from "../schemas";

const fields: FieldItem<FirstAdminValues>[] = [
  {
    name: "name",
    label: "Your name",
    type: "input",
    required: true,
    props: { autoComplete: "name" },
  },
  {
    name: "email",
    label: "Work email",
    type: "input",
    required: true,
    props: { type: "email", autoComplete: "email", autoCapitalize: "none", spellCheck: false },
  },
  {
    name: "password",
    label: "Password",
    type: "password",
    required: true,
    hint: "At least 8 characters.",
    props: { autoComplete: "new-password" },
  },
];

const failures = {
  taken: "This install already has an admin.",
  invalid: "Check your name, email and password.",
  failed: "Something went wrong on our side. Try again in a moment.",
} as const;

/** Step one on a new install: make the first admin, who is signed in straight away. */
export function FirstAdminStep() {
  const router = useRouter();
  const form = useForm<FirstAdminValues>({
    resolver: zodResolver(firstAdminSchema),
    defaultValues: { name: "", email: "", password: "" },
  });
  const error = form.formState.errors.root?.message;

  async function create(values: FirstAdminValues) {
    const result = await createAdmin(values);
    if (result.ok) {
      router.replace("/setup?step=brand");
      router.refresh();
    } else {
      form.setError("root", { message: failures[result.reason] });
    }
  }

  return (
    <form
      noValidate
      className="grid gap-5"
      onSubmit={(event) => {
        void form.handleSubmit(create)(event);
      }}
    >
      <div className="grid gap-1">
        <h2 className="text-lg font-semibold">Create the first admin</h2>
        <p className="text-muted-foreground text-sm">That is you.</p>
      </div>
      <FieldList control={form.control} fields={fields} disabled={form.formState.isSubmitting} />
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error} {error === failures.taken ? <Link href="/login">Go to sign-in</Link> : null}
        </p>
      ) : null}
      <Button type="submit" loading={form.formState.isSubmitting}>
        Create admin
      </Button>
    </form>
  );
}
