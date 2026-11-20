"use client";

import { emailTemplateKinds, type EmailTemplateKind, type Settings } from "@helpwren/core";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  FieldList,
  Icon,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  toast,
  type FieldItem,
} from "@helpwren/design-system";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { emailTemplates, emailVariableHelp } from "@/lib/email/templates";
import { useMediaQuery } from "@/lib/use-media-query";

import { saveEmailTemplates, sendTemplateTest } from "../actions";
import {
  emailTemplatesSchema,
  type EmailTemplateFields,
  type EmailTemplatesValues,
} from "../schemas";
import { EmailPreview } from "./email-preview";
import { SaveBar, saveErrors } from "./save-bar";
import { SettingsSection } from "./settings-frame";

export interface EmailTemplatesFormProps {
  settings: Settings;
  /** Whether this install can send mail at all, for the test button. */
  canSend: boolean;
  /** Where a test email goes: the signed-in admin's own address. */
  testAddress: string;
  canEdit: boolean;
}

const EMPTY: EmailTemplateFields = { subject: "", heading: "", body: "", button: "" };

function toValues(settings: Settings): EmailTemplatesValues {
  const saved = settings.email.templates;
  const fields = (kind: EmailTemplateKind): EmailTemplateFields => ({
    subject: saved[kind]?.subject ?? "",
    heading: saved[kind]?.heading ?? "",
    body: saved[kind]?.body ?? "",
    button: saved[kind]?.button ?? "",
  });
  return {
    chatReply: fields("chatReply"),
    ticketReply: fields("ticketReply"),
    ticketStatus: fields("ticketStatus"),
  };
}

/** The form's words for one email, with the empty ones left for Helpwren's. */
function shownTemplate(fields: EmailTemplateFields) {
  return Object.fromEntries(Object.entries(fields).filter(([, value]) => value.trim() !== ""));
}

/**
 * The wording of each email contacts get, with Helpwren's own as the placeholder in every
 * field, and the email as it will arrive beside it. The layout and the small print stay.
 */
export function EmailTemplatesForm({
  settings,
  canSend,
  testAddress,
  canEdit,
}: EmailTemplatesFormProps) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [kind, setKind] = useState<EmailTemplateKind>("chatReply");
  const form = useForm<EmailTemplatesValues>({
    resolver: zodResolver(emailTemplatesSchema),
    defaultValues: toValues(settings),
  });
  const values = useWatch({ control: form.control }) as EmailTemplatesValues;
  const disabled = !canEdit || form.formState.isSubmitting;
  const info = emailTemplates[kind];

  const wide = useMediaQuery("(min-width: 64rem)");
  const [previewing, setPreviewing] = useState(false);
  const preview = (
    <EmailPreview
      brand={settings.brand}
      kind={kind}
      template={shownTemplate(values[kind])}
      from={settings.email.fromName ?? settings.brand.name}
    />
  );

  async function save(next: EmailTemplatesValues) {
    setSaved(false);
    try {
      const result = await saveEmailTemplates(next);
      if (result.ok) {
        form.reset(next);
        setSaved(true);
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
      const result = await sendTemplateTest(kind, form.getValues());
      if (result.ok) toast.success(`Test email sent to ${testAddress}.`);
      else toast.error(result.detail);
    } catch {
      toast.error("The test email could not be sent.");
    } finally {
      setTesting(false);
    }
  }

  const fieldsFor = (of: EmailTemplateKind): FieldItem<EmailTemplatesValues>[] => {
    const defaults = emailTemplates[of].defaults;
    return [
      {
        name: `${of}.subject`,
        label: "Subject",
        type: "input",
        props: { placeholder: defaults.subject },
      },
      {
        name: `${of}.heading`,
        label: "Heading",
        type: "input",
        props: { placeholder: defaults.heading },
      },
      {
        name: `${of}.body`,
        label: "Message",
        type: "textarea",
        hint:
          of === "ticketStatus"
            ? "A blank line starts a new paragraph."
            : "A blank line starts a new paragraph. The replies themselves are quoted below it.",
        props: { placeholder: defaults.body, rows: 4 },
      },
      {
        name: `${of}.button`,
        label: "Button",
        type: "input",
        props: { placeholder: defaults.button },
      },
    ];
  };

  const customised = Object.values(values[kind]).some((value) => value.trim() !== "");

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1fr)_24rem] xl:grid-cols-[minmax(0,1fr)_28rem]">
      <form
        noValidate
        className="max-lg:pb-16"
        onSubmit={(event) => {
          void form.handleSubmit(save)(event);
        }}
      >
        <Tabs
          value={kind}
          onValueChange={(next) => {
            setKind(next as EmailTemplateKind);
          }}
        >
          <div className="bg-card sticky top-0 z-10 -mx-1 [scrollbar-width:none] overflow-x-auto px-1 py-3 [&::-webkit-scrollbar]:hidden">
            <TabsList aria-label="Which email">
              {emailTemplateKinds.map((each) => (
                <TabsTrigger key={each} value={each}>
                  {emailTemplates[each].tab}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          {emailTemplateKinds.map((each) => (
            <TabsContent key={each} value={each} className="pt-1">
              <SettingsSection
                title={emailTemplates[each].label}
                description={`${emailTemplates[each].description} Leave a field empty to use the wording shown in it.`}
              >
                <FieldList control={form.control} fields={fieldsFor(each)} disabled={disabled} />
                {canEdit ? (
                  <div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={disabled || !customised}
                      onClick={() => {
                        form.setValue(each, EMPTY, { shouldDirty: true });
                      }}
                    >
                      <Icon name="arrow-u-up-left" />
                      Reset to default
                    </Button>
                  </div>
                ) : null}
              </SettingsSection>
            </TabsContent>
          ))}
        </Tabs>
        <SettingsSection
          title="Placeholders"
          description="Type these anywhere above. Each email fills them in for the contact it goes to."
        >
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-xs">
            {info.variables.map((variable) => (
              <div key={variable} className="contents">
                <dt>
                  <code className="bg-muted rounded px-1.5 py-0.5 font-mono">{`{{${variable}}}`}</code>
                </dt>
                <dd className="text-muted-foreground">{emailVariableHelp[variable]}</dd>
              </div>
            ))}
          </dl>
        </SettingsSection>
        {canEdit ? (
          <SettingsSection
            title="Try it"
            description={`Sends this email as it reads now, saved or not, to ${testAddress}, with made-up details.`}
          >
            <div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                loading={testing}
                disabled={!canSend}
                onClick={() => {
                  void test();
                }}
              >
                Send me a test
              </Button>
            </div>
            {canSend ? null : (
              <p role="note" className="text-muted-foreground text-xs">
                Set up sending and a from address on the Email page first.
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
      {wide ? <aside className="sticky top-3">{preview}</aside> : null}
      <Button
        variant="secondary"
        className="fixed right-4 bottom-18 z-20 rounded-full shadow-lg md:bottom-6 lg:hidden"
        onClick={() => {
          setPreviewing(true);
        }}
      >
        <Icon name="eye" />
        Preview
      </Button>
      <Dialog open={previewing && !wide} onOpenChange={setPreviewing}>
        <DialogContent fullScreen aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Preview</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto">{preview}</div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
