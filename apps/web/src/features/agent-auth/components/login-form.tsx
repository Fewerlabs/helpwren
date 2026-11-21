"use client";

import { LOGIN_CODE_LENGTH, loginCodeSchema, loginEmailSchema } from "@helpwren/core";
import { Button, FieldList, Icon, OtpInput, type FieldItem } from "@helpwren/design-system";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, type ComponentProps, type ReactNode } from "react";
import { useForm, type Control, type FieldValues } from "react-hook-form";
import { z } from "zod";

import { requestLoginCode, submitLoginCode, submitPassword } from "../actions";

// The same rules the client library applies, with messages written for this form.
const emailRule = z.string().refine((value) => loginEmailSchema.safeParse(value).success, {
  error: "Enter your email address.",
});
const passwordFormSchema = z.object({
  email: emailRule,
  password: z.string().min(1, "Enter your password."),
});
const codeFormSchema = z.object({
  code: z.string().refine((value) => loginCodeSchema.safeParse(value).success, {
    error: `Enter the ${LOGIN_CODE_LENGTH}-digit code from the email.`,
  }),
});

type PasswordForm = z.infer<typeof passwordFormSchema>;
type CodeForm = z.infer<typeof codeFormSchema>;

const passwordFields: FieldItem<PasswordForm>[] = [
  {
    name: "email",
    label: "Work email",
    type: "input",
    required: true,
    props: {
      type: "email",
      autoComplete: "email",
      autoCapitalize: "none",
      spellCheck: false,
      prepend: <Icon name="envelope" />,
    },
  },
  { name: "password", label: "Password", type: "password", required: true },
];

const codeFields: FieldItem<CodeForm>[] = [
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
        // The last digit sends the form: there is nothing else on it to fill in.
        onComplete={() => {
          // After this change has reached the form, so the whole code is what is submitted.
          queueMicrotask(() => {
            const box = document.activeElement;
            if (box instanceof HTMLInputElement) box.form?.requestSubmit();
          });
        }}
      />
    ),
  },
];

const TRY_AGAIN = "Something went wrong on our side. Try again in a moment.";
const NOT_ON_TEAM = "This email is not on the team. Ask an admin to invite you.";

const passwordErrors = {
  invalid_credentials: "That email and password do not match.",
  not_an_agent: NOT_ON_TEAM,
  rate_limited: "Too many tries. Wait a few minutes, or sign in with a code.",
  failed: TRY_AGAIN,
} as const;

const codeErrors = {
  invalid_code: "That code is wrong or out of date. Check it, or send a new one.",
  not_an_agent: NOT_ON_TEAM,
  failed: TRY_AGAIN,
} as const;

interface StepProps<Values extends FieldValues> {
  title: string;
  /** Under the heading, when there is something to say: what has just happened. */
  description?: ReactNode;
  control: Control<Values>;
  fields: FieldItem<Values>[];
  rootError: string | undefined;
  submitting: boolean;
  submitLabel: string;
  onSubmit: NonNullable<ComponentProps<"form">["onSubmit"]>;
  children?: ReactNode;
}

function Step<Values extends FieldValues>({
  title,
  description,
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
      <div className="grid gap-1">
        <h1 className="text-xl font-semibold">{title}</h1>
        {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
      </div>
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

export interface LoginFormProps {
  title?: string;
  /** Where to go once signed in. Only `/setup` is honoured; anything else goes to the dashboard. */
  next?: string;
  /** Offer a code by email in place of a password. Only where the install can send email. */
  allowCode?: boolean;
}

/**
 * Sign-in for team members: an email and a password, or a code emailed to them for anyone
 * without a password.
 */
export function LoginForm({
  title = "Sign in to Helpwren",
  next,
  allowCode = true,
}: LoginFormProps) {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: { email: "", password: "" },
  });
  const codeForm = useForm<CodeForm>({
    resolver: zodResolver(codeFormSchema),
    defaultValues: { code: "" },
  });
  const [sendingCode, setSendingCode] = useState(false);

  async function signInWithPassword({ email, password }: PasswordForm) {
    // On success the action redirects, so a result here is always a failure.
    const result = await submitPassword(email, password, next);
    passwordForm.setError("root", { message: passwordErrors[result.reason] });
  }

  /** Checks only the email, as a code needs no password. */
  async function sendCode() {
    if (!(await passwordForm.trigger("email"))) return;
    const email = passwordForm.getValues("email");
    setSendingCode(true);
    try {
      const result = await requestLoginCode(email);
      if (result.ok) {
        passwordForm.clearErrors();
        setSentTo(email);
      } else {
        passwordForm.setError("root", { message: TRY_AGAIN });
      }
    } finally {
      setSendingCode(false);
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

  async function signInWithCode(email: string, { code }: CodeForm) {
    setResent(false);
    const result = await submitLoginCode(email, code, next);
    codeForm.setError("root", { message: codeErrors[result.reason] });
  }

  if (sentTo === null) {
    const busy = passwordForm.formState.isSubmitting || sendingCode;
    return (
      <Step
        title={title}
        control={passwordForm.control}
        fields={passwordFields}
        rootError={passwordForm.formState.errors.root?.message}
        submitting={busy}
        submitLabel="Sign in"
        onSubmit={(event) => {
          void passwordForm.handleSubmit(signInWithPassword)(event);
        }}
      >
        {allowCode ? (
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => {
              void sendCode();
            }}
          >
            Email me a code instead
          </Button>
        ) : null}
      </Step>
    );
  }

  return (
    <Step
      title={title}
      // What was done with the email takes the place of the introduction, where the eye already is.
      description={
        <span role="status">
          {resent ? "A new code is on its way. " : null}
          If <span className="text-foreground font-medium">{sentTo}</span> is on the team, a{" "}
          {LOGIN_CODE_LENGTH}-digit code has been sent to it.
        </span>
      }
      control={codeForm.control}
      fields={codeFields}
      rootError={codeForm.formState.errors.root?.message}
      submitting={codeForm.formState.isSubmitting}
      submitLabel="Sign in"
      onSubmit={(event) => {
        void codeForm.handleSubmit((values) => signInWithCode(sentTo, values))(event);
      }}
    >
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
          Use a password
        </Button>
      </div>
    </Step>
  );
}
