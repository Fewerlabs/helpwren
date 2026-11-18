"use client";

import { LOGIN_CODE_LENGTH, loginCodeSchema, loginEmailSchema } from "@helpwren/core";
import { Button, FieldList, type FieldItem } from "@helpwren/design-system";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, type ComponentProps, type ReactNode } from "react";
import { useForm, type Control, type FieldValues } from "react-hook-form";
import { z } from "zod";

import { requestLoginCode, submitLoginCode } from "../actions";

// The same rules the client library applies, with messages written for this form.
const emailFormSchema = z.object({
  email: z.string().refine((value) => loginEmailSchema.safeParse(value).success, {
    error: "Enter your email address.",
  }),
});
const codeFormSchema = z.object({
  code: z.string().refine((value) => loginCodeSchema.safeParse(value).success, {
    error: `Enter the ${LOGIN_CODE_LENGTH}-digit code from the email.`,
  }),
});

type EmailForm = z.infer<typeof emailFormSchema>;
type CodeForm = z.infer<typeof codeFormSchema>;

const emailFields: FieldItem<EmailForm>[] = [
  {
    name: "email",
    label: "Work email",
    type: "input",
    required: true,
    props: { type: "email", autoComplete: "email", autoCapitalize: "none", spellCheck: false },
  },
];

const codeFields: FieldItem<CodeForm>[] = [
  {
    name: "code",
    label: "Sign-in code",
    type: "input",
    required: true,
    props: {
      inputMode: "numeric",
      autoComplete: "one-time-code",
      maxLength: LOGIN_CODE_LENGTH,
      spellCheck: false,
      inputClassName: "font-mono tracking-widest",
    },
  },
];

const TRY_AGAIN = "Something went wrong on our side. Try again in a moment.";

const codeErrors = {
  invalid_code: "That code is wrong or out of date. Check it, or send a new one.",
  not_an_agent: "This email is not on the team. Ask an admin to invite you.",
  failed: TRY_AGAIN,
} as const;

interface StepProps<Values extends FieldValues> {
  control: Control<Values>;
  fields: FieldItem<Values>[];
  rootError: string | undefined;
  submitting: boolean;
  submitLabel: string;
  onSubmit: NonNullable<ComponentProps<"form">["onSubmit"]>;
  children?: ReactNode;
}

function Step<Values extends FieldValues>({
  control,
  fields,
  rootError,
  submitting,
  submitLabel,
  onSubmit,
  children,
}: StepProps<Values>) {
  return (
    <form noValidate className="grid gap-5" onSubmit={onSubmit}>
      <FieldList control={control} fields={fields} disabled={submitting} />
      {rootError ? (
        <p role="alert" className="text-destructive text-sm">
          {rootError}
        </p>
      ) : null}
      <Button type="submit" loading={submitting}>
        {submitLabel}
      </Button>
      {children}
    </form>
  );
}

/** Sign-in for team members: ask for an email, then for the code sent to it. */
export function LoginForm() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const emailForm = useForm<EmailForm>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: { email: "" },
  });
  const codeForm = useForm<CodeForm>({
    resolver: zodResolver(codeFormSchema),
    defaultValues: { code: "" },
  });

  async function sendCode({ email }: EmailForm) {
    const result = await requestLoginCode(email);
    if (result.ok) {
      setSentTo(email);
    } else {
      emailForm.setError("root", { message: TRY_AGAIN });
    }
  }

  async function resendCode(email: string) {
    setResent(false);
    codeForm.reset();
    const result = await requestLoginCode(email);
    if (result.ok) {
      setResent(true);
    } else {
      codeForm.setError("root", { message: TRY_AGAIN });
    }
  }

  async function signIn(email: string, { code }: CodeForm) {
    setResent(false);
    // On success the action redirects to the inbox, so a result here is always a failure.
    const result = await submitLoginCode(email, code);
    codeForm.setError("root", { message: codeErrors[result.reason] });
  }

  if (sentTo === null) {
    return (
      <Step
        control={emailForm.control}
        fields={emailFields}
        rootError={emailForm.formState.errors.root?.message}
        submitting={emailForm.formState.isSubmitting}
        submitLabel="Email me a code"
        onSubmit={(event) => {
          void emailForm.handleSubmit(sendCode)(event);
        }}
      />
    );
  }

  return (
    <Step
      control={codeForm.control}
      fields={codeFields}
      rootError={codeForm.formState.errors.root?.message}
      submitting={codeForm.formState.isSubmitting}
      submitLabel="Sign in"
      onSubmit={(event) => {
        void codeForm.handleSubmit((values) => signIn(sentTo, values))(event);
      }}
    >
      <p className="text-muted-foreground text-sm" role="status">
        {resent ? "A new code is on its way. " : null}
        If <span className="text-foreground font-medium">{sentTo}</span> is on the team, a{" "}
        {LOGIN_CODE_LENGTH}-digit code has been sent to it.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="ghost"
          size="sm"
          disabled={codeForm.formState.isSubmitting}
          onClick={() => {
            void resendCode(sentTo);
          }}
        >
          Send a new code
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={codeForm.formState.isSubmitting}
          onClick={() => {
            codeForm.reset();
            setResent(false);
            setSentTo(null);
          }}
        >
          Use a different email
        </Button>
      </div>
    </Step>
  );
}
