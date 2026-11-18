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

const fields: FieldItem<InstallationValues>[] = [
  {
    name: "allowedDomains",
    label: "Allowed domains",
    type: "tags",
    hint: "The sites that may show your chat, such as example.com or *.example.com. Press Enter after each.",
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
    <div className="grid gap-8">
      <section aria-labelledby="snippet-title" className="grid gap-3">
        <div className="grid gap-1">
          <h3 id="snippet-title" className="text-sm font-semibold">
            Add the chat to your site
          </h3>
          <p className="text-muted-foreground text-sm">
            Paste this before the closing <code className="font-mono text-xs">&lt;/body&gt;</code>{" "}
            tag on every page that should show the chat.
          </p>
        </div>
        <CodeSnippet code={snippet} language="HTML" />
      </section>

      <form
        noValidate
        className="grid gap-6"
        onSubmit={(event) => {
          void form.handleSubmit(save)(event);
        }}
      >
        <FieldList
          control={form.control}
          fields={fields}
          disabled={!canEdit || form.formState.isSubmitting}
        />
        {domains.length === 0 ? (
          <p role="note" className="border-rule bg-muted rounded-xl border px-4 py-3 text-sm">
            No domains are set, so any site can show your chat. Add yours to limit it to them.
          </p>
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
    </div>
  );
}
