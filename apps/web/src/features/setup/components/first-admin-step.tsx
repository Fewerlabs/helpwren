"use client";

import { LOGIN_CODE_LENGTH, loginCodeSchema } from "@helpwren/core";
import { Button, FieldList, Link, OtpInput, type FieldItem } from "@helpwren/design-system";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { createAdmin, sendSetupCode, verifySetupCode } from "../actions";
import { firstAdminSchema, type FirstAdminValues } from "../schemas";

const codeSchema = z.object({
  code: z.string().refine((value) => loginCodeSchema.safeParse(value).success, {
    error: `Enter the ${LOGIN_CODE_LENGTH}-digit code from the email.`,
  }),
});
type CodeValues = z.infer<typeof codeSchema>;

const adminFields: FieldItem<FirstAdminValues>[] = [
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
];

const codeFields: FieldItem<CodeValues>[] = [
  {
    name: "code",
    label: "Sign-in code",
    type: "custom",
    required: true,
    render: ({ field }) => (
      <OtpInput
        ref={field.ref}
        name={field.name}
        value={field.value}
        length={LOGIN_CODE_LENGTH}
        onValueChange={field.onChange}
        onBlur={field.onBlur}
      />
    ),
  },
];

const emailSchema = firstAdminSchema.pick({ email: true });
type EmailValues = z.infer<typeof emailSchema>;

const emailFields: FieldItem<EmailValues>[] = [
  {
    name: "email",
    label: "Work email",
    type: "input",
    required: true,
    props: { type: "email", autoComplete: "email", autoCapitalize: "none", spellCheck: false },
  },
];

export interface FirstAdminStepProps {
  /** The local test mailbox, when the install runs on the local Supabase stack. */
  mailboxUrl: string | null;
  /**
   * The first admin exists but has not signed in yet, such as after closing the tab while the
   * code was on its way. They sign in here to carry on.
   */
  adminExists: boolean;
}

/**
 * Step one on a new install: make the first admin, then sign them in with an emailed code.
 * Signing in is by code only, so this step also says where the code will come from.
 */
export function FirstAdminStep({ mailboxUrl, adminExists }: FirstAdminStepProps) {
  const router = useRouter();
  // Who the code went to. The name is known only when they were created here and now.
  const [admin, setAdmin] = useState<{ email: string; name?: string } | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "problem"; text: string } | null>(null);
  const adminForm = useForm<FirstAdminValues>({
    resolver: zodResolver(firstAdminSchema),
    defaultValues: { name: "", email: "" },
  });
  const emailForm = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });
  const codeForm = useForm<CodeValues>({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: "" },
  });

  async function create(values: FirstAdminValues) {
    const result = await createAdmin(values);
    if (!result.ok) {
      adminForm.setError("root", {
        message:
          result.reason === "taken"
            ? "This install already has an admin. Sign in instead."
            : "Check your name and email.",
      });
      return;
    }
    setAdmin(firstAdminSchema.parse(values));
    setNotice(
      result.code.ok
        ? { tone: "ok", text: `A ${LOGIN_CODE_LENGTH}-digit code is on its way.` }
        : { tone: "problem", text: `The code could not be sent: ${result.code.detail}` },
    );
  }

  async function requestCode({ email }: EmailValues) {
    const result = await sendSetupCode(email);
    if (!result.ok) {
      emailForm.setError("root", { message: `The code could not be sent: ${result.detail}` });
      return;
    }
    setAdmin({ email });
    setNotice({ tone: "ok", text: `If ${email} is the admin, a code is on its way.` });
  }

  async function resend(email: string) {
    codeForm.reset();
    const result = await sendSetupCode(email);
    setNotice(
      result.ok
        ? { tone: "ok", text: "A new code is on its way." }
        : { tone: "problem", text: `The code could not be sent: ${result.detail}` },
    );
  }

  async function signIn(email: string, { code }: CodeValues) {
    const result = await verifySetupCode(email, code);
    if (result.ok) {
      router.replace("/setup?step=brand");
      router.refresh();
    } else {
      codeForm.setError("root", { message: result.detail });
    }
  }

  const where = (
    <ul className="text-muted-foreground grid list-disc gap-1 pl-5 text-sm">
      <li>
        Supabase Auth sends it, not Helpwren&rsquo;s own email settings.
        {mailboxUrl ? (
          <>
            {" "}
            This install runs on the local stack, so it lands in the{" "}
            <Link href={mailboxUrl} external>
              local mailbox
            </Link>
            .
          </>
        ) : null}
      </li>
      <li>
        On Supabase Cloud, the built-in sender only reaches the addresses of your Supabase
        organisation&rsquo;s members, a few times an hour. For anyone else, add your own SMTP in
        Supabase: Authentication, then Emails.
      </li>
    </ul>
  );

  if (admin === null && adminExists) {
    return (
      <form
        noValidate
        className="grid gap-5"
        onSubmit={(event) => {
          void emailForm.handleSubmit(requestCode)(event);
        }}
      >
        <div className="grid gap-1">
          <h2 className="text-lg font-semibold">Sign in to finish setting up</h2>
          <p className="text-muted-foreground text-sm">
            This install has its first admin. If that is you, sign in to carry on with the setup.
          </p>
        </div>
        <FieldList
          control={emailForm.control}
          fields={emailFields}
          disabled={emailForm.formState.isSubmitting}
        />
        {emailForm.formState.errors.root ? (
          <p role="alert" className="text-destructive text-sm">
            {emailForm.formState.errors.root.message}
          </p>
        ) : null}
        {where}
        <Button type="submit" loading={emailForm.formState.isSubmitting}>
          Email me a code
        </Button>
      </form>
    );
  }

  if (admin === null) {
    return (
      <form
        noValidate
        className="grid gap-5"
        onSubmit={(event) => {
          void adminForm.handleSubmit(create)(event);
        }}
      >
        <div className="grid gap-1">
          <h2 className="text-lg font-semibold">Create the first admin</h2>
          <p className="text-muted-foreground text-sm">
            That is you. There are no passwords: you sign in with a code sent to this email.
          </p>
        </div>
        <FieldList
          control={adminForm.control}
          fields={adminFields}
          disabled={adminForm.formState.isSubmitting}
        />
        {where}
        {adminForm.formState.errors.root ? (
          <p role="alert" className="text-destructive text-sm">
            {adminForm.formState.errors.root.message} <Link href="/login">Go to sign-in</Link>
          </p>
        ) : null}
        <Button type="submit" loading={adminForm.formState.isSubmitting}>
          Create admin and email me a code
        </Button>
      </form>
    );
  }

  return (
    <form
      noValidate
      className="grid gap-5"
      onSubmit={(event) => {
        void codeForm.handleSubmit((values) => signIn(admin.email, values))(event);
      }}
    >
      <div className="grid gap-1">
        <h2 className="text-lg font-semibold">
          {admin.name ? `Sign in, ${admin.name}` : "Enter your code"}
        </h2>
        <p className="text-muted-foreground text-sm">
          {admin.name ? "You are the admin. " : null}Enter the code sent to{" "}
          <span className="text-foreground font-medium">{admin.email}</span>.
        </p>
      </div>
      {notice ? (
        <p
          role={notice.tone === "ok" ? "status" : "alert"}
          className={notice.tone === "ok" ? "text-sm" : "text-destructive text-sm"}
        >
          {notice.text}
        </p>
      ) : null}
      <FieldList
        control={codeForm.control}
        fields={codeFields}
        disabled={codeForm.formState.isSubmitting}
      />
      {codeForm.formState.errors.root ? (
        <p role="alert" className="text-destructive text-sm">
          {codeForm.formState.errors.root.message}
        </p>
      ) : null}
      {where}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={codeForm.formState.isSubmitting}>
          Sign in
        </Button>
        <Button
          variant="ghost"
          disabled={codeForm.formState.isSubmitting}
          onClick={() => {
            void resend(admin.email);
          }}
        >
          Send a new code
        </Button>
        <Button variant="ghost" asChild>
          <a href="/login">Sign in later</a>
        </Button>
      </div>
    </form>
  );
}
