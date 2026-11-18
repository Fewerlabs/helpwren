"use client";

import { type Settings } from "@helpwren/core";
import { Badge, Button, FieldList, toast, type FieldItem } from "@helpwren/design-system";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { saveEmail, sendTestEmail } from "../actions";
import { emailSchema, type EmailValues } from "../schemas";
import { SaveBar, saveErrors } from "./save-bar";
import { SettingsSection } from "./settings-frame";

export interface EmailFormProps {
  settings: Settings;
  /** How this install sends mail, such as "SMTP", or `null` when no provider is set up. */
  provider: string | null;
  /** Where a test email goes: the signed-in admin's own address. */
  testAddress: string;
  canEdit: boolean;
}

/** Who the install's emails are from, how they are sent, and a way to try it. */
export function EmailForm({ settings, provider, testAddress, canEdit }: EmailFormProps) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const form = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      fromName: settings.email.fromName ?? "",
      fromAddress: settings.email.fromAddress ?? "",
    },
  });
  const disabled = !canEdit || form.formState.isSubmitting;

  const fields: FieldItem<EmailValues>[] = [
    {
      name: "fromAddress",
      label: "From address",
      type: "input",
      hint: "An address on a domain your provider lets you send from.",
      props: { type: "email", autoCapitalize: "none", placeholder: "support@example.com" },
    },
    {
      name: "fromName",
      label: "From name",
      type: "input",
      hint: "Leave empty to use your brand's name.",
      props: { placeholder: settings.brand.name },
    },
  ];

  async function save(values: EmailValues) {
    setSaved(false);
    try {
      const result = await saveEmail(values);
      if (result.ok) {
        form.reset(values);
        setSaved(true);
        toast.success("Changes saved");
        router.refresh();
      } else {
        form.setError("root", { message: saveErrors[result.reason] });
      }
    } catch {
      form.setError("root", { message: saveErrors.failed });
    }
  }

  async function test() {
    setTesting(true);
    try {
      const result = await sendTestEmail();
      if (result.ok) toast.success(`Test email sent to ${testAddress}`);
      // The provider's own words: an admin is the person who can act on them.
      else toast.error(result.detail);
    } catch {
      toast.error("The test email could not be sent. Try again.");
    } finally {
      setTesting(false);
    }
  }

  const ready = provider !== null && Boolean(settings.email.fromAddress);

  return (
    <form
      noValidate
      onSubmit={(event) => {
        void form.handleSubmit(save)(event);
      }}
    >
      <SettingsSection
        title="Sending"
        description="How this install sends mail. It is set on the server, with EMAIL_PROVIDER, because it holds a secret."
      >
        <div className="flex items-center gap-2">
          {provider ? (
            <Badge variant="accent">{provider}</Badge>
          ) : (
            <Badge variant="outline">Not set up</Badge>
          )}
          <p className="text-muted-foreground text-xs">
            {provider
              ? "Emails go out through this provider."
              : "No emails are sent until a provider is set. See the setup guide."}
          </p>
        </div>
      </SettingsSection>
      <SettingsSection
        title="Sender"
        description="Who emails to your contacts and your team are from."
      >
        <FieldList control={form.control} fields={fields} disabled={disabled} />
      </SettingsSection>
      {canEdit ? (
        <SettingsSection
          title="Try it"
          description={`Sends one email to ${testAddress}, your own address, with the saved sender.`}
        >
          <div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={testing}
              disabled={!ready || form.formState.isDirty}
              onClick={() => {
                void test();
              }}
            >
              Send a test email
            </Button>
          </div>
          {ready ? null : (
            <p role="note" className="text-muted-foreground text-xs">
              {provider ? "Save a from address first." : "Set up a provider on the server first."}
            </p>
          )}
        </SettingsSection>
      ) : null}
      {canEdit ? (
        <SaveBar
          saving={form.formState.isSubmitting}
          saved={saved}
          dirty={form.formState.isDirty}
          error={form.formState.errors.root?.message}
        />
      ) : null}
    </form>
  );
}
