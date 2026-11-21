"use client";

import { type InboundProvider, type Settings } from "@helpwren/core";
import {
  Badge,
  Button,
  CodeSnippet,
  FieldList,
  Link,
  toast,
  type FieldItem,
} from "@helpwren/design-system";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { makeInboundSecret, saveEmail, sendTestEmail } from "../actions";
import { emailSchema, type EmailValues } from "../schemas";
import { SaveBar, saveErrors } from "./save-bar";
import { SettingsSection } from "./settings-frame";

/** The provider saved in Settings → Email, as the browser may see it: never its secret. */
export type SavedSending =
  | { provider: "smtp"; host: string; port: number; user: string; hasPassword: boolean }
  | { provider: "resend" };

export interface EmailFormProps {
  settings: Settings;
  /** How this install sends mail, such as "SMTP", or `null` when no provider is set up. */
  provider: string | null;
  /** Why the provider set up cannot be used, such as an `SMTP_URL` the server cannot read. */
  providerProblem?: string | null;
  /**
   * `"server"` when the server's environment sets how mail is sent; otherwise the provider saved
   * here, without its secret, or `null` when none is saved.
   */
  sending?: "server" | SavedSending | null;
  /** Where a test email goes: the signed-in admin's own address. */
  testAddress: string;
  /** Which secrets for replies by email are saved. Their values never reach the browser. */
  inbound: {
    secret: boolean;
    resendSigningSecret: boolean;
    resendApiKey: boolean;
    sendingResendKey: boolean;
    lastReceivedAt: string | null;
  };
  /** This install's address, for the webhook. */
  origin: string;
  canEdit: boolean;
}

const providerOptions = [
  { value: "resend", label: "Resend" },
  { value: "postmark", label: "Postmark" },
  { value: "generic", label: "Another provider (signed JSON)" },
];

const receivedFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });

/** The steps to have a provider pass replies on, in the order they are done. */
function checklist(provider: InboundProvider, domain: string): string[] {
  switch (provider) {
    case "resend":
      return [
        `In Resend, add ${domain} under Domains and turn on receiving. Add the MX record Resend shows to your DNS. Use a subdomain, such as support.example.com, so mail to your main domain is not affected.`,
        "In Resend, add a webhook for the email.received event, with the address below.",
        "Paste the webhook's signing secret here. Replies are read through Resend's API, so this install also needs an API key: the server's RESEND_API_KEY, or one pasted here.",
        "Save, then reply to one of your own test emails.",
      ];
    case "postmark":
      return [
        "In Postmark, open your server's inbound stream.",
        `To use your own domain, add an MX record for ${domain} pointing at inbound.postmarkapp.com (priority 10), and set ${domain} as the inbound domain.`,
        "Make a secret below, and paste the webhook address, with the secret in it, as the inbound webhook URL.",
        "Save, then reply to one of your own test emails.",
      ];
    case "generic":
      return [
        `Point ${domain}'s mail at your provider or bridge, as it explains.`,
        "Make a secret below, and have the bridge post each email to the address below as JSON, signed with it.",
        "Save, then reply to one of your own test emails.",
      ];
  }
}

const genericSample = (url: string) =>
  [
    'import { createHmac } from "node:crypto";',
    "",
    "const body = JSON.stringify({",
    '  from: "Priya Shah <priya@example.org>",',
    '  to: ["reply+<token>@support.example.com"],',
    "  // cc, deliveredTo: more addresses it was for",
    '  subject: "Re: New reply",',
    '  text: "Thanks, that worked.",',
    "  // html, messageId, inReplyTo, references",
    "  attachments: [], // { name, type, content: base64, inline }",
    "});",
    "const t = Math.floor(Date.now() / 1000);",
    'const v1 = createHmac("sha256", SECRET).update(`${t}.${body}`).digest("hex");',
    "",
    `await fetch("${url}", {`,
    '  method: "POST",',
    '  headers: { "content-type": "application/json", "helpwren-signature": `t=${t},v1=${v1}` },',
    "  body,",
    "});",
  ].join("\n");

/** Who the install's emails are from, how they are sent, how replies come back, and a test. */
export function EmailForm({
  settings,
  provider,
  providerProblem = null,
  sending = null,
  testAddress,
  inbound,
  origin,
  canEdit,
}: EmailFormProps) {
  const router = useRouter();
  const savedSmtp =
    sending !== null && sending !== "server" && sending.provider === "smtp" ? sending : null;
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [making, setMaking] = useState(false);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const form = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      fromName: settings.email.fromName ?? "",
      fromAddress: settings.email.fromAddress ?? "",
      replies: settings.email.replies,
      status: settings.email.status,
      inboundEnabled: settings.email.inbound.enabled,
      replyAddress: settings.email.inbound.address ?? "",
      inboundProvider: settings.email.inbound.provider,
      resendSigningSecret: "",
      resendApiKey: "",
      sendingProvider:
        savedSmtp?.provider ?? (sending === "server" ? "smtp" : (sending?.provider ?? "smtp")),
      sendingApiKey: "",
      smtpHost: savedSmtp?.host ?? "",
      smtpPort: savedSmtp ? String(savedSmtp.port) : "",
      smtpUser: savedSmtp?.user ?? "",
      smtpPassword: "",
    },
  });
  const [inboundEnabled, inboundProvider, replyAddress, sendingProvider] = useWatch({
    control: form.control,
    name: ["inboundEnabled", "inboundProvider", "replyAddress", "sendingProvider"],
  });
  const disabled = !canEdit || form.formState.isSubmitting;
  const hasSecret = inbound.secret || newSecret !== null;

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

  const savedPassword = savedSmtp?.hasPassword === true;
  const savedResendKey = sending !== null && sending !== "server" && sending.provider === "resend";
  const providerField: FieldItem<EmailValues>[] = [
    {
      name: "sendingProvider",
      label: "Provider",
      type: "select",
      props: {
        options: [
          { value: "smtp", label: "SMTP" },
          { value: "resend", label: "Resend" },
        ],
      },
    },
  ];
  const resendKeyField: FieldItem<EmailValues>[] = [
    {
      name: "sendingApiKey",
      label: "API key",
      type: "password",
      hint: savedResendKey
        ? "Saved. Leave empty to keep it."
        : "A Resend API key that may send, from resend.com/api-keys. It starts with re_.",
      props: { autoComplete: "new-password" },
    },
  ];
  const smtpFields: FieldItem<EmailValues>[] = [
    {
      name: "smtpHost",
      label: "SMTP server",
      type: "input",
      props: { autoCapitalize: "none", spellCheck: false, placeholder: "smtp.example.com" },
    },
    {
      name: "smtpPort",
      label: "Port",
      type: "input",
      hint: "587 for most providers, or 465.",
      props: { inputMode: "numeric", placeholder: "587" },
    },
    {
      name: "smtpUser",
      label: "Username",
      type: "input",
      hint: "Often your email address.",
      props: { autoCapitalize: "none", spellCheck: false, autoComplete: "off" },
    },
    {
      name: "smtpPassword",
      label: "Password",
      type: "password",
      ...(savedPassword ? { hint: "Saved. Leave empty to keep it." } : {}),
      props: { autoComplete: "new-password" },
    },
  ];

  const contactFields: FieldItem<EmailValues>[] = [
    {
      name: "replies",
      label: "Replies they have not read",
      type: "switch",
      hint: "Sent five minutes after your team replies, if the contact has not read it in the chat.",
    },
    {
      name: "status",
      label: "Changes to a ticket's status",
      type: "switch",
      hint: "Sent when your team resolves, reopens or parks their ticket.",
    },
  ];

  const inboundSwitch: FieldItem<EmailValues>[] = [
    {
      name: "inboundEnabled",
      label: "Let contacts reply by email",
      type: "switch",
      hint: "Their answer lands in the same conversation, as if they had written in the chat.",
    },
  ];

  const inboundFields: FieldItem<EmailValues>[] = [
    {
      name: "replyAddress",
      label: "Reply address",
      type: "input",
      hint: "Each email adds a signed part after a plus, such as reply+k7f…@support.example.com, so a reply finds its conversation and nobody can write into someone else's.",
      props: { type: "email", autoCapitalize: "none", placeholder: "reply@support.example.com" },
    },
    {
      name: "inboundProvider",
      label: "Received by",
      type: "select",
      props: { options: providerOptions },
    },
  ];

  const resendFields: FieldItem<EmailValues>[] = [
    {
      name: "resendSigningSecret",
      label: inbound.resendSigningSecret ? "Replace the signing secret" : "Webhook signing secret",
      type: "input",
      hint: "On the webhook's page in Resend. It starts with whsec_.",
      props: {
        type: "password",
        autoComplete: "off",
        placeholder: inbound.resendSigningSecret ? "Leave empty to keep the saved secret" : "",
      },
    },
    {
      name: "resendApiKey",
      label: inbound.resendApiKey ? "Replace the API key" : "API key",
      type: "input",
      hint: inbound.sendingResendKey
        ? "Leave empty to use the key mail is sent with. A key that may only send cannot read; use a full-access key if replies do not arrive."
        : "Resend's webhook says only that an email arrived; its words and files are read with this key.",
      props: {
        type: "password",
        autoComplete: "off",
        placeholder: inbound.resendApiKey ? "Leave empty to keep the saved key" : "re_…",
      },
    },
  ];

  async function save(values: EmailValues) {
    setSaved(false);
    try {
      const result = await saveEmail(values);
      if (result.ok) {
        form.reset({
          ...values,
          resendSigningSecret: "",
          resendApiKey: "",
          sendingApiKey: "",
          smtpPassword: "",
        });
        setSaved(true);
        toast.success("Changes saved");
        router.refresh();
      } else if (result.reason === "invalid" && values.inboundEnabled && !values.replyAddress) {
        form.setError("replyAddress", { message: "Enter the address replies should go to." });
      } else if (result.reason === "invalid" && values.smtpUser && !values.smtpPassword) {
        form.setError("smtpPassword", { message: "Enter the password for this username." });
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

  async function makeSecret() {
    setMaking(true);
    try {
      const result = await makeInboundSecret();
      if (result.ok) {
        setNewSecret(result.secret);
        router.refresh();
      } else {
        toast.error(saveErrors.forbidden);
      }
    } catch {
      toast.error("The secret could not be made. Try again.");
    } finally {
      setMaking(false);
    }
  }

  const ready = provider !== null && Boolean(settings.email.fromAddress);
  const webhook = new URL(`/api/email/inbound/${inboundProvider}`, origin);
  // Postmark has no signatures; the secret travels as the password in the address.
  const webhookUrl =
    inboundProvider === "postmark"
      ? `${webhook.protocol}//postmark:${newSecret ?? "<secret>"}@${webhook.host}${webhook.pathname}`
      : webhook.href;
  const domain = /@(.+)$/.exec(replyAddress)?.[1] ?? "your reply domain";

  return (
    <form
      noValidate
      onSubmit={(event) => {
        void form.handleSubmit(save)(event);
      }}
    >
      <SettingsSection
        title="Sending"
        description="How this install sends mail. Your provider lists these details."
      >
        <div className="flex items-center gap-2">
          {provider ? (
            <Badge variant="accent">{provider}</Badge>
          ) : providerProblem ? (
            <Badge variant="danger">Not working</Badge>
          ) : (
            <Badge variant="outline">Not set up</Badge>
          )}
          <p className="text-muted-foreground text-xs">
            {providerProblem ??
              (sending === "server"
                ? "Set on the server with environment variables."
                : provider
                  ? "Emails go out through this provider."
                  : "No emails are sent until a provider is set.")}
          </p>
        </div>
        {sending === "server" ? null : (
          <FieldList
            control={form.control}
            fields={[
              ...providerField,
              ...(sendingProvider === "resend" ? resendKeyField : smtpFields),
            ]}
            disabled={disabled}
          />
        )}
      </SettingsSection>
      <SettingsSection
        title="Sender"
        description="Who emails to your contacts and your team are from."
      >
        <FieldList control={form.control} fields={fields} disabled={disabled} />
      </SettingsSection>
      <SettingsSection
        title="To your contacts"
        description="When a contact who gave an email address hears from you by email as well as in the chat."
      >
        <FieldList control={form.control} fields={contactFields} disabled={disabled} />
        <p className="text-muted-foreground text-xs">
          Change what they say in{" "}
          <Link href="/dashboard/settings/email-templates">Email templates</Link>.
        </p>
      </SettingsSection>
      <SettingsSection
        title="Replies by email"
        description="Contacts answer the emails above from their mail app. Your mail provider receives the reply and passes it to this install."
      >
        <FieldList control={form.control} fields={inboundSwitch} disabled={disabled} />
        {inboundEnabled ? (
          <>
            <FieldList control={form.control} fields={inboundFields} disabled={disabled} />
            <div className="grid gap-2">
              <p className="font-medium">Setting it up</p>
              <ol className="text-muted-foreground grid list-decimal gap-1 pl-5 text-xs">
                {checklist(inboundProvider, domain).map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </div>
            <div className="grid gap-2">
              <p className="font-medium">Webhook address</p>
              <CodeSnippet
                variant="inline"
                aria-label="Webhook address"
                code={webhookUrl}
                copyLabel="Copy address"
                copiedLabel="Address copied"
                copiedMessage="Address copied"
              />
            </div>
            {inboundProvider === "resend" ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  {inbound.resendSigningSecret ? (
                    <Badge variant="accent">Signing secret saved</Badge>
                  ) : (
                    <Badge variant="outline">No signing secret</Badge>
                  )}
                  {inbound.resendApiKey ? (
                    <Badge variant="accent">API key saved</Badge>
                  ) : inbound.sendingResendKey ? (
                    <Badge variant="outline">Using the sending key</Badge>
                  ) : (
                    <Badge variant="outline">No API key</Badge>
                  )}
                </div>
                <FieldList control={form.control} fields={resendFields} disabled={disabled} />
              </>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  {hasSecret ? (
                    <Badge variant="accent">Secret saved</Badge>
                  ) : (
                    <Badge variant="outline">No secret</Badge>
                  )}
                </div>
                {newSecret ? (
                  <div role="status" className="grid gap-2">
                    <p className="font-medium">Copy the secret now. It will not be shown again.</p>
                    <CodeSnippet
                      variant="inline"
                      aria-label="Inbound secret"
                      code={newSecret}
                      copyLabel="Copy secret"
                      copiedLabel="Secret copied"
                      copiedMessage="Secret copied"
                    />
                  </div>
                ) : null}
                {canEdit ? (
                  <div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      loading={making}
                      onClick={() => {
                        void makeSecret();
                      }}
                    >
                      {hasSecret ? "Make a new secret" : "Make a secret"}
                    </Button>
                  </div>
                ) : null}
                {inboundProvider === "generic" ? (
                  <CodeSnippet
                    wrap
                    tabs={[{ label: "Node.js", language: "js", code: genericSample(webhook.href) }]}
                    tabsLabel="Posting an email"
                    copiedMessage="Code copied"
                  />
                ) : null}
              </>
            )}
            <p role="note" className="text-muted-foreground text-xs">
              {inbound.lastReceivedAt
                ? `Last reply received ${receivedFormat.format(new Date(inbound.lastReceivedAt))}.`
                : "No replies have arrived yet."}
            </p>
          </>
        ) : null}
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
              {provider ? "Save a from address first." : "Save a provider above first."}
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
