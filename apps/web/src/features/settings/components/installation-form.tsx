"use client";

import { allowedDomainSchema, type Settings } from "@helpwren/core";
import { CodeSnippet, FieldList, type FieldItem } from "@helpwren/design-system";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { saveInstallation } from "../actions";
import { installationSchema, type InstallationValues } from "../schemas";
import { SaveBar, saveErrors } from "./save-bar";
import { SettingsSection } from "./settings-frame";

const fields: FieldItem<InstallationValues>[] = [
  {
    name: "allowedDomains",
    label: "Domains",
    type: "tags",
    hint: "Such as example.com or *.example.com. Press Enter after each.",
    props: {
      placeholder: "example.com",
      transform: (text) =>
        text
          .trim()
          .toLowerCase()
          .replace(/^https?:\/\//, "")
          .replace(/\/.*$/, ""),
      validate: (value) => allowedDomainSchema.safeParse(value).success,
      removeLabel: (domain) => `Remove ${domain}`,
    },
  },
];

export interface InstallationFormProps {
  settings: Settings;
  /** The public address of this install, which the snippet loads the widget from. */
  appUrl: string;
  canEdit: boolean;
}

/** The snippet a site pastes to show the chat, and the list of sites allowed to. */
export function InstallationForm({ settings, appUrl, canEdit }: InstallationFormProps) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const form = useForm<InstallationValues>({
    resolver: zodResolver(installationSchema),
    defaultValues: { allowedDomains: settings.allowedDomains },
  });
  const domains = useWatch({ control: form.control, name: "allowedDomains" });

  const snippet = [
    `<script src="${appUrl.replace(/\/$/, "")}/widget.js"></script>`,
    "<script>",
    '  Helpwren.init({ source: "web" });',
    "</script>",
  ].join("\n");

  async function save(values: InstallationValues) {
    setSaved(false);
    try {
      const result = await saveInstallation(values);
      if (result.ok) {
        form.reset(values);
        setSaved(true);
        router.refresh();
      } else {
        form.setError("root", { message: saveErrors[result.reason] });
      }
    } catch {
      form.setError("root", { message: saveErrors.failed });
    }
  }

  return (
    <form
      noValidate
      onSubmit={(event) => {
        void form.handleSubmit(save)(event);
      }}
    >
      <SettingsSection
        title="Widget"
        description={
          <>
            Paste this before the closing <code className="font-mono">&lt;/body&gt;</code> tag on
            every page that should show the chat.
          </>
        }
      >
        <CodeSnippet code={snippet} language="HTML" />
      </SettingsSection>
      <SettingsSection
        title="Chat page"
        description="The chat on a page of its own. Link to it from an email, a profile or a QR code."
      >
        <CodeSnippet code={`${appUrl.replace(/\/$/, "")}/chat`} language="Link" />
      </SettingsSection>
      <SettingsSection
        title="Allowed domains"
        description="The sites that may show your chat. Other sites are refused by the visitor's browser."
      >
        <FieldList
          control={form.control}
          fields={fields}
          disabled={!canEdit || form.formState.isSubmitting}
        />
        {domains.length === 0 ? (
          <p role="note" className="bg-muted rounded-lg px-3 py-2">
            No domains are set, so any site can show your chat. Add yours to limit it to them.
          </p>
        ) : null}
      </SettingsSection>
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
